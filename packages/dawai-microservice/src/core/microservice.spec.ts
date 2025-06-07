import fetch from 'node-fetch'; // Using node-fetch v2
import { Microservice } from './microservice';
import { EmailService } from '../example.service';
import { HttpTransportAdapter } from '../transports/http.transport.adapter';
import { metadataStorage } from '../decorators/metadata.storage';

let assertionsFailed = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`Assertion Failed: ${message}`);
    assertionsFailed++;
  } else {
    console.log(`Assertion Passed: ${message}`);
  }
}

// Helper to delay execution, useful if server needs a moment to start
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  console.log('--- Starting Microservice HTTP Integration Test ---');

  // Decorators run when EmailService class is defined/imported.
  // Instantiating it isn't strictly necessary for metadata registration here
  // if the class itself is passed to Microservice constructor and processed there.
  // However, explicitly creating an instance ensures decorators have run.
  new EmailService();

  const microservice = new Microservice(EmailService);
  const httpAdapter = new HttpTransportAdapter();

  // Pass some arbitrary options to registerTransport to ensure they can be merged/overridden
  microservice.registerTransport(httpAdapter, { /* port: 9999, someOtherOption: 'value' */ });

  await microservice.bootstrap();
  await microservice.listen();

  await delay(100);

  const expectedPort = 3000; // From @webservice in EmailService
  const classMetaForBasePath = metadataStorage.getClassMetadata(EmailService);
  const basePath = classMetaForBasePath?.webservice?.options?.crud?.options?.basePath || '';
  const crudEndpoint = '/email';
  const url = `http://localhost:${expectedPort}${basePath}${crudEndpoint}`;

  console.log(`Making POST request to: ${url}`);
  let response: fetch.Response | undefined; // Explicitly type response
  let responseBody: any = null;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'test@example.com', subject: 'Hello', body: 'Test' }) // Added a body
    });
    responseBody = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', responseBody);
  } catch (error) {
    console.error('Fetch error:', error);
    assert(false, `HTTP request to ${url} failed: ${error}`);
  }

  assert(response !== undefined, 'Response should be defined');
  if (response) {
    assert(response.status === 200, `Response status should be 200, was ${response.status}`);
    assert(responseBody !== null, 'Response body should not be null');
    if (responseBody) {
      assert(responseBody.message === 'Handler matched (placeholder response)', 'Response message incorrect');
      assert(responseBody.route === '/api/v1/email', 'Response route incorrect');
      assert(responseBody.httpMethod === 'POST', 'Response httpMethod incorrect');
      assert(responseBody.handlerMethod === 'sendEmail', 'Response handlerMethod incorrect');
    }
  }

  const classMeta = metadataStorage.getClassMetadata(EmailService);
  assert(classMeta?.webservice?.options?.port === expectedPort, `Port from metadata should be ${expectedPort}`);
  assert(classMeta?.webservice?.options?.crud?.options?.basePath === basePath, `BasePath from metadata should be '${basePath}'`);

  await microservice.close();
  console.log('Microservice closed.');

  await delay(100);

  if (assertionsFailed > 0) {
    console.error(`--- TEST FAILED: ${assertionsFailed} assertions failed. ---`);
    process.exit(1);
  } else {
    console.log('--- TEST PASSED ---');
  }
}

runTest().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
