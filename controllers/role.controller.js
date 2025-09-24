const Roles = require("../models/Role.model");

/* -------------------------------- GET ----------------------------- */
const getRoles = async (req, res) => {
  try {
    const roles = await Roles.find()
      .lean();
    if (roles.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Roles not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Roles found successfully",
      data: roles,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Roles.findById({ _id: id })
      .lean();
    if (!role) {
      return res
        .status(200)
        .json({ success: false, message: "Role not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Role found successfully",
      data: role,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createRole = async (req, res) => {
  try {
    const {
      name,
      permissions,
    } = req.body;

    if (
      !name ||
      !permissions
    ) {
      return res
        .status(200)
        .json({ success: false, message: "All fields are required" });
    }

    const createRole = await Roles.create({
      name,
      permissions,
    });

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: createRole,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      permissions,
    } = req.body;

    const updateRole = await Roles.findByIdAndUpdate(
      { _id: id },
      {
        name,
        permissions,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Role updated successfully",
      data: updateRole,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteRole = await Roles.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Role deleted successfully",
      data: deleteRole,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const deleteRole = await Roles.deleteMany({
      _id: { $in: ids },
    }); 

    return res.status(201).json({
      success: true,
      message: "Role deleted successfully",
      data: deleteRole,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  bulkDelete,
};
