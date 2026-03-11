import crypto from 'crypto';

// JSON:API success response
export const formatResponse = (res, statusCode, data, extraMeta = {}) => {
    return res.status(statusCode).json({
        meta: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            ...extraMeta
        },
        data
    });
};

// RFC 7807 Problem Details error response
export const formatError = (res, statusCode, { type, title, detail, instance, errors } = {}) => {
    const body = {
        type: type || 'about:blank',
        title: title || 'Error',
        status: statusCode,
        detail
    };
    if (instance) body.instance = instance;
    if (errors) body.errors = errors;

    return res.status(statusCode).json(body);
};
