const mongoose = require('mongoose');
const EmergencyContact = require('../models/EmergencyContact');
const { validatePhoneNumber } = require('../utils/phoneValidator');

function toPublic(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    phone: doc.phone,
    relationship: doc.relationship,
    notifyOnAlert: Boolean(doc.notifyOnAlert),
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : undefined,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : undefined,
  };
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function list(req, res) {
  try {
    const docs = await EmergencyContact.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    return res.status(200).json({
      success: true,
      contacts: docs.map(toPublic),
    });
  } catch (err) {
    console.error('contacts list:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not load contacts',
    });
  }
}

async function create(req, res) {
  try {
    const { name, phone, relationship, notifyOnAlert } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'name is required',
      });
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'phone is required',
      });
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.error,
      });
    }
    if (!relationship || typeof relationship !== 'string' || !relationship.trim()) {
      return res.status(400).json({
        success: false,
        message: 'relationship is required',
      });
    }

    const payload = {
      user: req.user.id,
      name: name.trim(),
      phone: phoneValidation.cleanedPhone,
      relationship: relationship.trim(),
    };
    if (typeof notifyOnAlert === 'boolean') {
      payload.notifyOnAlert = notifyOnAlert;
    }

    const doc = await EmergencyContact.create(payload);

    return res.status(201).json({
      success: true,
      contact: toPublic(doc),
    });
  } catch (err) {
    console.error('contacts create:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not create contact',
    });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact id',
      });
    }

    const { name, phone, relationship, notifyOnAlert } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'name cannot be empty',
        });
      }
      updates.name = name.trim();
    }
    if (phone !== undefined) {
      if (typeof phone !== 'string' || !phone.trim()) {
        return res.status(400).json({
          success: false,
          message: 'phone cannot be empty',
        });
      }

      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: phoneValidation.error,
        });
      }

      updates.phone = phoneValidation.cleanedPhone;
    }
    if (relationship !== undefined) {
      if (typeof relationship !== 'string' || !relationship.trim()) {
        return res.status(400).json({
          success: false,
          message: 'relationship cannot be empty',
        });
      }
      updates.relationship = relationship.trim();
    }
    if (notifyOnAlert !== undefined) {
      updates.notifyOnAlert = Boolean(notifyOnAlert);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    const doc = await EmergencyContact.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    return res.status(200).json({
      success: true,
      contact: toPublic(doc),
    });
  } catch (err) {
    console.error('contacts update:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not update contact',
    });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact id',
      });
    }

    const result = await EmergencyContact.deleteOne({
      _id: id,
      user: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Contact removed',
    });
  } catch (err) {
    console.error('contacts remove:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not remove contact',
    });
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
  toPublic,
};
