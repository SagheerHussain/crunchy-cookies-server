const Permissions = require("../models/Permissions.model");

/* -------------------------------- GET ----------------------------- */
const getPermissions = async (req, res) => {
  try {
    const permission = await Permissions.find()
      .lean();
    if (permission.length === 0) {
      return res
        .status(200)    
        .json({ success: false, message: "Permission not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Permission found successfully",
      data: permission,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getPermissionsById = async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await Permissions.findById({ _id: id })
      .lean();
    if (!permission) {
      return res
        .status(200)
        .json({ success: false, message: "Permission not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Permission found successfully",
      data: permission,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


/* -------------------------------- POST ----------------------------- */
const createPermissions = async (req, res) => {
  try {
    const {
      permission,
    } = req.body;

    if (!permission) {
      return res
        .status(200)
        .json({ success: false, message: "Permission not found" });
    }

    const createPermission = await Permissions.create({
      permission,
    });

    return res.status(201).json({
      success: true,
      message: "Permission created successfully",
      data: createPermission,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updatePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      permission,
    } = req.body;

    const updatePermission = await Permissions.findByIdAndUpdate(
      { _id: id },
      {
        permission,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Permission updated successfully",
      data: updatePermission,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deletePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const deletePermission = await Permissions.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "Permission deleted successfully",
      data: deletePermission,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const deletePermission = await Permissions.deleteMany({ _id: { $in: ids } });

    return res.status(201).json({
      success: true,
      message: "Permission deleted successfully",
      data: deletePermission,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPermissions,
  getPermissionsById,
  createPermissions,
  updatePermissions,
  deletePermissions,
  bulkDelete,
};
