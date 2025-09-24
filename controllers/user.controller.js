const User = require("../models/User.model");

/* -------------------------------- GET ----------------------------- */
const getUsers = async (req, res) => {
  try {
    const users = await User.find().populate("roles").lean();
    if (users.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "Users not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Users found successfully",
      data: users,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById({ _id: id }).lean();
    if (!user) {
      return res
        .status(200)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({
      success: true,
      message: "User found successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- POST ----------------------------- */
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, gender, roles, dob } =
      req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res
        .status(200)
        .json({ success: false, message: "All fields are required" });
    }

    const createUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      roles,
      dob,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: createUser,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- PUT ----------------------------- */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      roles,
      dob,
      lastLoginAt,
      status,
      passwordChangedAt,
    } = req.body;

    const updateUser = await User.findByIdAndUpdate(
      { _id: id },
      {
        firstName,
        lastName,
        email,
        phone,
        password,
        gender,
        roles,
        dob,
        lastLoginAt,
        status,
        passwordChangedAt,
      }
    );

    return res.status(201).json({
      success: true,
      message: "User updated successfully",
      data: updateUser,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/* -------------------------------- DELETE ----------------------------- */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteUser = await User.findOneAndDelete({ _id: id });

    return res.status(201).json({
      success: true,
      message: "User deleted successfully",
      data: deleteUser,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.params;
    const deleteUser = await User.deleteMany({
      _id: { $in: ids },
    });

    return res.status(201).json({
      success: true,
      message: "User deleted successfully",
      data: deleteUser,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  bulkDelete,
};
