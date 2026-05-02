const OpenAI = require("openai");
const {
  persistIncident,
  resolveReporterFromReq,
  incidentToPublic,
  SERVICE_TYPES,
} = require("../controllers/incidentsController");

const CREATE_INCIDENT_TOOL = {
  type: "function",
  function: {
    name: "create_incident",
    description:
      "Create an emergency dispatch incident when the caller clearly needs ambulance (medical), fire department, or police. Pick exactly one service type from what they said.",
    parameters: {
      type: "object",
      properties: {
        serviceType: {
          type: "string",
          enum: ["ambulance", "fire", "police"],
        },
        description: {
          type: "string",
          description:
            "Concise summary of the emergency situation for responders",
        },
      },
      required: ["serviceType", "description"],
    },
  },
};

const SYSTEM_PROMPT = `You are RapidAid's emergency voice intake assistant.
Your job is to understand what the caller needs and, when they are clearly requesting emergency services, call the create_incident tool exactly once with the correct service type and a short factual description.

Rules:
- ambulance: medical emergencies, injury, chest pain, unconscious person, overdose, etc.
- fire: fire, smoke, gas leak, rescue from height (unless purely medical), hazardous materials fire context.
- police: crime, violence, theft in progress, suspicious dangerous activity, traffic collision where police are needed, etc.
- If the message is too vague to choose a service or is not an emergency request, do NOT call the tool. Briefly ask what service they need or tell them to state police, fire, or ambulance.
- Never invent details; use only what the caller said. If description would be empty, use a short phrase derived from their words.
- After a successful tool call, reply with one reassuring sentence that dispatch has been notified.`;

/** GitHub Models inference is OpenAI-compatible at `{base}/chat/completions`. */
const INFERENCE_BASE_URL = (
  process.env.GITHUB_MODELS_INFERENCE_URL ||
  "https://models.github.ai/inference"
).replace(/\/$/, "");
const MODEL = process.env.GITHUB_MODELS_VOICE_MODEL || "openai/gpt-4o-mini";
const MAX_TOOL_ROUNDS = 4;

function createGithubModelsClient(pat) {
  return new OpenAI({
    apiKey: pat,
    baseURL: INFERENCE_BASE_URL,
    organization: null,
    project: null,
    defaultHeaders: {
      Accept: "application/vnd.github+json",
    },
  });
}

/**
 * Run LLM tool loop and optionally persist an incident.
 *
 * @param {string} transcript
 * @param {object} location - normalized location object
 * @param {import('express').Request} req
 * @returns {Promise<{ success: boolean, message: string, incident?: object }>}
 */
async function runVoiceIncidentOrchestration(transcript, location, req) {
  const pat = process.env.GITHUB_MODELS_PAT;
  if (!pat || !String(pat).trim()) {
    return {
      success: false,
      message:
        "Voice reporting is not configured (missing GITHUB_MODELS_PAT). Add a GitHub PAT with the models scope. See backend/.env.example.",
    };
  }

  const trimmed = typeof transcript === "string" ? transcript.trim() : "";
  if (!trimmed) {
    return {
      success: false,
      message: "No speech was recognized. Please try again.",
    };
  }

  const client = createGithubModelsClient(String(pat).trim());
  const { reporterUserId, reporterEmail } = await resolveReporterFromReq(req);

  /** @type {import('mongoose').Document | null} */
  let createdIncident = null;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: trimmed },
  ];

  let rounds = 0;
  while (rounds < MAX_TOOL_ROUNDS) {
    rounds += 1;
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: [CREATE_INCIDENT_TOOL],
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    const msg = choice.message;
    if (!msg) {
      return {
        success: false,
        message: "Assistant returned no message. Please try again.",
      };
    }

    const toolCalls = msg.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      const text =
        (msg.content && msg.content.trim()) ||
        "Could not process voice request.";
      return {
        success: false,
        message: text,
      };
    }

    messages.push(msg);

    for (const tc of toolCalls) {
      if (tc.type !== "function" || tc.function.name !== "create_incident") {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ error: "Unknown tool" }),
        });
        continue;
      }

      if (createdIncident) {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({
            error: "An incident was already created from this voice request.",
          }),
        });
        continue;
      }

      let args;
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ error: "Invalid arguments JSON" }),
        });
        continue;
      }

      const serviceType = args.serviceType;
      let description =
        typeof args.description === "string" ? args.description.trim() : "";
      if (!description) {
        description = trimmed.slice(0, 2000);
      }

      if (!serviceType || !SERVICE_TYPES.has(serviceType)) {
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({
            error: "serviceType must be ambulance, fire, or police",
          }),
        });
        continue;
      }

      try {
        const incident = await persistIncident({
          serviceType,
          description,
          location,
          reporterUserId,
          reporterEmail,
        });
        createdIncident = incident;
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({
            success: true,
            incidentId: incident._id.toString(),
            serviceType,
          }),
        });
      } catch (err) {
        console.error("voiceIncident persistIncident:", err);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({
            success: false,
            error: "Database error while creating incident",
          }),
        });
      }
    }

    if (createdIncident) {
      const followUp = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: [CREATE_INCIDENT_TOOL],
        tool_choice: "none",
      });
      const finalMsg = followUp.choices[0]?.message;
      const summary =
        (finalMsg && finalMsg.content && finalMsg.content.trim()) ||
        "Your report was received and sent to dispatch.";
      return {
        success: true,
        message: summary,
        incident: incidentToPublic(createdIncident),
      };
    }
  }

  return {
    success: false,
    message:
      "Could not complete the voice report after several attempts. Please use the buttons and submit form, or try again.",
  };
}

module.exports = {
  runVoiceIncidentOrchestration,
};
