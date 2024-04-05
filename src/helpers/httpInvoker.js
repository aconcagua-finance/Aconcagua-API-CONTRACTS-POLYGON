/* eslint-disable camelcase */
const httpContext = require('express-http-context');
const { HttpClient, CustomError } = require('../vs-core');

const { LoggerHelper } = require('../vs-core-firebase');

exports.invoke_post_api = async function ({ endpoint, payload, noTrace }) {
  const httpMethod = 'POST';

  const apiUrl = endpoint;

  let result = null;

  const traceStart = new Date();

  try {
    const authHeader = httpContext.get('request-authorization-header');
    const spanId = httpContext.get('span-id');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader ? authHeader.authorization : null,
      },
    };

    if (spanId) config.headers.spanid = spanId;

    result = await HttpClient.httpPost(apiUrl, {
      data: payload,
      ...config,
    });

    // Calculate the difference in milliseconds
    const difference_ms = new Date().getTime() - traceStart.getTime();

    const isErrorResponse = !result || !result.data;

    const responseStatusCode = result && result.status ? result.status : '400';

    LoggerHelper.serviceLogger({
      severity: isErrorResponse ? LoggerHelper.SEVERITY_ERROR : LoggerHelper.SEVERITY_INFO,
      message: 'API Invoke: (' + responseStatusCode + ') [' + httpMethod + '] ' + apiUrl,

      service: apiUrl,
      elapsedTime: difference_ms,
      request: payload,
      response: !noTrace ? result : 'noTrace',
    });

    if (isErrorResponse) {
      throw new CustomError.TechnicalError(
        'API_HTTP_ERROR',
        responseStatusCode,
        'Hubo un error en la respuesta de API' // TODO - Michel poner desc de api
      );
    }
    return result;
  } catch (e) {
    if (e.response) {
      // eslint-disable-next-line no-console
      console.error(
        'ERROR HTTP CLIENT',
        e.message,
        e.isAxiosError,
        JSON.stringify(e.response),
        'ERROR DATA HTTP CLIENT:',
        JSON.stringify(e.response.data)
      );
    }
    const responseStatusCode = result && result.status ? result.status : '400';

    const difference_ms = new Date().getTime() - traceStart.getTime();
    LoggerHelper.serviceLogger({
      severity: LoggerHelper.SEVERITY_ERROR,
      message: 'API Invoke: (' + responseStatusCode + ') [' + httpMethod + '] ' + apiUrl,

      service: apiUrl,
      elapsedTime: difference_ms,
      request: payload,
      response: null,
      error: e,
    });

    throw e;
  }
};

exports.invoke_get_api = async function ({ endpoint, noTrace }) {
  const httpMethod = 'GET';

  const apiUrl = endpoint;

  let result = null;

  const traceStart = new Date();

  try {
    const authHeader = httpContext.get('request-authorization-header');
    const spanId = httpContext.get('span-id');

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader ? authHeader.authorization : null,
      },
    };

    if (spanId) config.headers.spanid = spanId;

    result = await HttpClient.httpGet(apiUrl, {
      ...config,
    });

    // Calculate the difference in milliseconds
    const difference_ms = new Date().getTime() - traceStart.getTime();

    const isErrorResponse = !result || !result.data;

    const responseStatusCode = result && result.status ? result.status : '400';

    LoggerHelper.serviceLogger({
      severity: isErrorResponse ? LoggerHelper.SEVERITY_ERROR : LoggerHelper.SEVERITY_INFO,
      message: 'API Invoke: (' + responseStatusCode + ') [' + httpMethod + '] ' + apiUrl,

      service: apiUrl,
      elapsedTime: difference_ms,
      request: null,
      response: !noTrace ? result : 'noTrace',
    });

    if (isErrorResponse) {
      throw new CustomError.TechnicalError(
        'API_HTTP_ERROR',
        responseStatusCode,
        'Hubo un error en la respuesta de API' // TODO - Michel poner desc de api
      );
    }
    return result;
  } catch (e) {
    const responseStatusCode = result && result.status ? result.status : '400';

    const difference_ms = new Date().getTime() - traceStart.getTime();
    LoggerHelper.serviceLogger({
      severity: LoggerHelper.SEVERITY_ERROR,
      message: 'API Invoke: (' + responseStatusCode + ') [' + httpMethod + '] ' + apiUrl,

      service: apiUrl,
      elapsedTime: difference_ms,
      request: null,
      response: null,
      error: e,
    });

    throw e;
  }
};
