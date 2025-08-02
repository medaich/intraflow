const emailReg = /^\S+@\S+\.\S+$/;

const pwReg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const errorMessages = {
  email: "Please use a valid email",
  password: "Password must be 8+ chars, with upper, lower, number, and symbol",
};

export { emailReg, pwReg, errorMessages };
