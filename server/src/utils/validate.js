const ApiError = require('./ApiError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s-]{7,20}$/;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const validators = {
  string(value, field, { min = 0, max = Infinity, pattern, label } = {}) {
    const name = label || field;
    const fail = (msg) => {
      throw ApiError.validation(msg, { [field]: msg });
    };

    if (typeof value !== 'string' || value.trim() === '') {
      fail(`${name} is required`);
    }
    const trimmed = value.trim();
    if (trimmed.length < min) {
      fail(`${name} must be at least ${min} characters`);
    }
    if (trimmed.length > max) {
      fail(`${name} must be at most ${max} characters`);
    }
    if (pattern && !pattern.test(trimmed)) {
      fail(`Please provide a valid ${name}`);
    }
    return trimmed;
  },

  email(value, label = 'email address') {
    return validators.string(value, 'email', {
      max: 254,
      pattern: EMAIL_RE,
      label,
    }).toLowerCase();
  },

  phone(value, { required = false, label = 'phone number' } = {}) {
    const fail = (msg) => {
      throw ApiError.validation(msg, { contact: msg });
    };

    if (value === undefined || value === null || value === '') {
      if (required) fail(`${label} is required`);
      return undefined;
    }
    if (typeof value !== 'string' || !PHONE_RE.test(value.trim())) {
      fail(`Please provide a valid ${label}`);
    }
    return value.trim();
  },

  password(value, { min = 8, label = 'password' } = {}) {
    const pwd = validators.string(value, 'password', {
      min,
      max: 128,
      label,
    });
    if (!/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
      const msg = `${label} must contain at least one letter and one number`;
      throw ApiError.validation(msg, { password: msg });
    }
    return pwd;
  },

  enum(value, allowed, { label = 'value', required = true, field = null } = {}) {
    const key = field || label.replace(/\s+/g, '').toLowerCase();
    const fail = (msg) => {
      throw ApiError.validation(msg, { [key]: msg });
    };

    if (value === undefined || value === null || value === '') {
      if (required) fail(`${label} is required`);
      return undefined;
    }
    const normalised = String(value).toLowerCase();
    if (!allowed.includes(normalised)) {
      fail(`${label} must be one of: ${allowed.join(', ')}`);
    }
    return normalised;
  },

  number(value, field, { min = -Infinity, max = Infinity, required = true } = {}) {
    const fail = (msg) => {
      throw ApiError.validation(msg, { [field.toLowerCase()]: msg });
    };

    if (value === undefined || value === null || value === '') {
      if (required) fail(`${field} is required`);
      return undefined;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      fail(`${field} must be a number`);
    }
    if (num < min || num > max) {
      fail(`${field} must be between ${min} and ${max}`);
    }
    return num;
  },

  boolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    return value === true || value === 'true' || value === 'on' || value === 1;
  },

  objectId(value, label = 'id') {
    if (!OBJECT_ID_RE.test(String(value))) {
      const msg = `Invalid ${label}`;
      throw ApiError.validation(msg, { [label.replace(/\s+/g, '')]: msg });
    }
    return String(value);
  },
};

module.exports = { validators, EMAIL_RE, PHONE_RE, OBJECT_ID_RE };
