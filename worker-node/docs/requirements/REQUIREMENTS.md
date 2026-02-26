# worker-node requirements

The NewsNexus11 parent project is a integration of the News Nexus 10 ecosystem into one monorepo.
The worker-node subproject project, which we are working on now and this document lays out the requirements for will be an ExpressJS TypeScript project. It will contain the codebase in an src/ directory.

## Overview of worker-node

This application will be modualar so that parts of the code can be updated or replaced with minimal impact on other functionalities. Let's make use of a src/modules directory to store files that appropriately named for the functions they do.

The News Nexus 10 ecosystem had external microservices such as the NewsNexusRequesterGoogleRss04, NewsNexusSemanticScorer02 and NewsNexusLlmStateAssigner01 which were node.js scripts that were run on their own or as child processes and all connected to database useing the NewsNexus10Db custom package. Now we want to create the worker-node/ project which will be a simple ExpressJS application that will connect to the db-models/ internal custom package to connect to the database. The worker-node project will absorb the NewsNexusRequesterGoogleRss04, NewsNexusSemanticScorer02 and NewsNexusLlmStateAssigner01. There will be route files for each of these old microservices. There will be endpoitns that the worker-node has that will receive local requests from the api to start the functionaltiy of each of the microservices.

The worker-node will also have a queueing functionality that queues all jobs so that the server is not overwhelmed. The queue will be one at a time and allow for endpoints that will check the queue of jobs.

Also we'll be able to cancel jobs by their job id, whether they have started or not. Let's make a queue-info/ subdomain and routes file that has endpoints for check-status/:job_id, queue_status/ and cancel_job/:job_id endpoints that will do as their names suggest. The engineer shoudl assign the appropriate method to each endpoint.

## Implementation

The implementation of the worker-node project will be based on a todo list in a file called worker-node/docs/requirements/REQUIREMENTS_TODO.md with phases and tasks that have checkboxes in the style of `[ ]`. The implementing engineer will complete a phase and check off the tasks completed with `[x]` only after the tests pass. Once all the tests pass for the phase the engineer will commit changes.

## Tests

see the docs/TEST_IMPLEMENTATION_NODE.md document for guidance on implementing tests.

## Routes

The section headings are the name of the subdomian. If the engineer finds a conflict with the naming convention they should bring this up as an issue before proceeding. The file name pattern for the routes will be routes/[subdomainInCamelCase].ts.

### queue-info/

This routes file will contain at least the check-status/:job_id, queue_status/ and cancel_job/:job_id endpoints as described earlier.

### request-google-rss/

The endpoints in this subdomain will be in a file routes/requestGoogleRss.ts. There should be one endpoint that starts a job called POST /request-google-rss/start-job. This endpoint will search for the excel file that is stored in the path and file name in the .env variable named PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED.

The reference code for implementing this functionality can be found in the /Users/nick/Documents/NewsNexus10-OBE/NewsNexusRequesterGoogleRss04.

### semantic-scorer/

The endpoints in this subdomain will be in a file routes/semanticScorer.ts. There should be one endpoint that starts a job called POST /semantic-scorer/start-job. The NewsNexusSemanticScorer02 project made use of two .env vars that were redundant: PATH_TO_SEMANTIC_SCORER_DIR and PATH_TO_SEMANTIC_SCORER_KEYWORDS_EXCEL_FILE. Let's only use the PATH_TO_SEMANTIC_SCORER_DIR as the path to where files for this functionality. This directory will contain the NewsNexusSemanticScorerKeywords.xlsx file used to score the articles as well as any text files the NewsNexusSemanticScorer02 microservice created.
The reference code for implementing this functionality can be found in the /Users/nick/Documents/NewsNexus10-OBE/NewsNexusSemanticScorer02.

### state-assigner/

The endpoints in this subdomain will be in a file routes/stateAssigner.ts. There should be one endpoint that starts a job called POST /state-assigner/start-job.

The NewsNexusLlmStateAssigner01 project made use of .env vars:

- KEY_OPEN_AI
- TARGET_ARTICLE_THRESHOLD_DAYS_OLD
- TARGET_ARTICLE_STATE_REVIEW_COUNT
- PATH_TO_SAVE_CHATGPT_RESPONSES

The other .env variables teh NewsNexusLlmStateAssigner01 used are already in the .env for the worker-node/ project and not unique to this particular functionality. Let's remove the TARGET_ARTICLE_THRESHOLD_DAYS_OLD and TARGET_ARTICLE_STATE_REVIEW_COUNT. These will be json body elements passed in the request. Let's rename them in the request to be camel case.

The reference code for implementing this functionality can be found in the /Users/nick/Documents/NewsNexus10-OBE/NewsNexusLlmStateAssigner01.

## .env variables

The worker-node/ will check for the .env variables on start and if not in the .env file the app will trigger error in the log and end the process.

.env vars:

- PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED
- PATH_TO_SEMANTIC_SCORER_DIR
- PATH_TO_LOGS
- NODE_ENV
- KEY_OPEN_AI
- PATH_TO_SAVE_CHATGPT_RESPONSES
- NAME_APP
- NAME_DB
- PATH_DATABASE

## Logging

use the guidance in the worker-node/docs/requirements/LOGGING_NODE_JS_V07.md file.

## Error responses

use the guidance in the worker-node/docs/requirements/ERROR_REQUIREMENTS.md

## Queueing requirements

Let's keep track of jobs in JSON file. This will keep the job id, job endpoint name, status, createdAt, startedAt (optional), endedAt (optional), failureReason (optional). Let's do an In-process queue, no BullMQ, no RabbitMQ. Writing to the JSON should require atomic write (temp + rename) and serialized access via a queue/lock.

Here questions and answers for implementing the queue functionality:

1. Should queued jobs survive process restarts, or can the queue reset on restart?

- answer: no, any stale job should be marked as status failed. Any stale, job will be one with a status queued, running. stale-job repair should also set endedAt and a failureReason (for example worker_restart) .

2. Will worker-node run as a single instance only, or may we run multiple instances later?

- answer: single instance

3. For cancel_job/:job_id, if a job is already running, should cancel mean: hard kill child process immediately, or mark cancel-requested and let job stop gracefully?

- answer: stop as gracefully as possible without waiting for the full job to complete. Some jobs may take hours to run - we don't want to wait hours. Use SIGTERM → wait 10 seconds → SIGKILL.

4. Do you want retries on failure? If yes, how many and with what delay/backoff?

- answer: no retries

5. Should we support job timeouts per job type (RSS, semantic scorer, state assigner)?

- answer: I'm not exactly sure what this means, but if the job iterates requests, it should wait 10 seconds max or less if the reference microservice waited less, then if there is timeout or longer than the allotted time, then the iteration should skip an continue to the next iteration. It should not kill the entire process. timeouts that are skippped should be logged. Apply this to external requests.

6. Do we need duplicate prevention (same payload submitted twice) or idempotency keys?

- answer: duplicate jobs should be handled as the microserivce handled them. If there is no reference to handling duplicates within the microservice's process, then just proceed redoing the job.

7. What job states do you want exposed (queued, running, completed, failed, canceled)?

- answer: the JSON file used as the "database" for this functionality will keep track of all the statuses of all jobs

8. How long should completed/failed job history be retained?

- answer: the JSON file should be kept for 30 days max, then deleted based on the createdAt. Implement a onStartUp module that has a function that checks the file.

9. Do queue-info endpoints need auth/role checks, or are they internal trusted-only?

- answer: no, auth/role, all endpoints will be called internally.

10. Should queue order always be FIFO, or do we need priority (for example, state-assigner > RSS)?

- answer: no priority, FIFO

11. Do we need progress updates/log streaming per job, or only final status?

- answer: no, but update the JSON file as appropriate

12. Is “one at a time” global across all job types, or one-at-a-time per route/subdomain?

- answer: global queue concurrency = 1
