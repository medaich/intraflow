export const emailReg = /^\S+@\S+\.\S+$/;

export const pwReg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

export const errorMessages = {
  email: "Please use a valid email",
  password: "Password must be 8+ chars, with upper, lower, number, and symbol",
};

export const DEFAULT_SIDEBAR_SIZE = 300;
export const MIN_SIDEBAR_SIZE = 200;
export const MAX_SIDEBAR_SIZE = 600;
