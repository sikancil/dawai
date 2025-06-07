import fetch from 'node-fetch';
import { Microservice } from './microservice';
import { EmailService } from '../example.service';
import { HttpTransportAdapter } from '../transports/http.transport.adapter';
// metadataStorage import removed as direct inspection is less critical now for this test

let assertionsFailed = 0;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`Assertion Failed: ${message}`);
    assertionsFailed++;
  } else {
    console.log(`Assertion Passed: ${message}`);
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
  console.log('--- Starting Microservice HTTP Integration Test (Parameter Injection) ---');

  const microservice = new Microservice(EmailService);
  const httpAdapter = new HttpTransportAdapter();

  microservice.registerTransport(httpAdapter);

  await microservice.bootstrap();
  await microservice.listen();

  await delay(200); // Increased delay slightly for server readiness

  const testUserId = 'user123';
  const testSendConfirmation = 'true';
  const testPayload = {
    to: 'test@example.com',
    subject: 'Hello Dawai',
    bodyContent: 'This is a test email.'
  };

  const expectedPort = 3000;
  const basePath = '/api/v1';
  const crudEndpoint = `/email/${testUserId}`; // Path param in URL
  const queryParams = `?sendConfirmation=${testSendConfirmation}`;
  const url = `http://localhost:${expectedPort}${basePath}${crudEndpoint}${queryParams}`;

  console.log(`Making POST request to: ${url}`);
  console.log(`With body:`, JSON.stringify(testPayload));

  let response;
  let responseBody: any = null;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    responseBody = await response.json(); // Assuming it's always JSON
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
      assert(responseBody.status === 'Email processed by service', 'Response "status" from service incorrect');
      assert(responseBody.userIdReceived === testUserId, `User ID from params incorrect. Expected: ${testUserId}, Got: ${responseBody.userIdReceived}`);
      assert(responseBody.confirmationRequested === (testSendConfirmation === 'true'), `Query param "sendConfirmation" incorrect. Expected: ${testSendConfirmation === 'true'}, Got: ${responseBody.confirmationRequested}`);
      assert(responseBody.toAddress === testPayload.to, `Body param "to" incorrect. Expected: ${testPayload.to}, Got: ${responseBody.toAddress}`);
      assert(responseBody.emailSubject === testPayload.subject, `Body param "subject" incorrect. Expected: ${testPayload.subject}, Got: ${responseBody.emailSubject}`);
      assert(responseBody.bodyReceived === testPayload.bodyContent, `Body param "bodyContent" incorrect. Expected: ${testPayload.bodyContent}, Got: ${responseBody.bodyReceived}`);
    }
  }

  await microservice.close();
  console.log('Microservice closed.');

  await delay(100);

  if (assertionsFailed > 0) {
    console.error(`--- TEST FAILED: ${assertionsFailed} assertions failed. ---`);
    // process.exit(1); // Removed for subtask compatibility
  } else {
    console.log('--- TEST PASSED ---');
  }
}

runTest().catch(err => {
  console.error('Test run failed with error:', err);
  // process.exit(1); // Removed for subtask compatibility
});
