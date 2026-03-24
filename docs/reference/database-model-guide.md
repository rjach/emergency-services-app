# How to Build MongoDB Models (Mongoose)

## What Is a Model?

A model describes a document structure in a MongoDB collection.

## Step-by-Step Model Creation

1. Create a file inside `backend/src/models/`.
2. Define a schema with fields and validation.
3. Export the model.
4. Use the model in controllers for CRUD operations.

## Example Model Template

```js
const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Example = mongoose.model('Example', exampleSchema);

module.exports = Example;
```

## Naming Suggestions

- Model file: `incident.model.js`
- Model name: `Incident`
- Collection: `incidents`

## Good Practices

- Use `required` for mandatory fields.
- Use `enum` for fixed choices.
- Use `timestamps: true` for audit fields.
