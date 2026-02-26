# worker-node requirements

The NewsNexus11 parent project is a integration of the News Nexus 10 ecosystem into one monorepo.
The worker-node subproject project, which we are working on now and this document lays out the requirements for will be an ExpressJS TypeScript project. It will contain the codebase in an src/ directory.

## Overview of worker-node

This application will be modualar so that parts of the code can be updated or replaced with minimal impact on other functionalities. Let's make use of a src/modules directory to store files that appropriately named for the functions they do.

The News Nexus 10 ecosystem had external microservices such as the NewsNexusRequesterGoogleRss04, NewsNexusSemanticScorer02 and NewsNexusLlmStateAssigner01 which were node.js scripts that were run on their own or as child processes and all connected to database useing the NewsNexus10Db custom package. Now we want to create the worker-node/ project which will be a simple ExpressJS application that will connect to the db-models/ internal custom package to connect to the database. The worker-node project will absorb the NewsNexusRequesterGoogleRss04, NewsNexusSemanticScorer02 and NewsNexusLlmStateAssigner01. There will be route files for each of these old microservices. There will be endpoitns that the worker-node has that will receive local requests from the api to start the functionaltiy of each of the microservices.

The worker-node will also have a queueing functionality that queues all jobs so that the server is not overwhelmed. The queue will be one at a time and allow for endpoints that will check the queue of jobs.

Also we'll be able to cancel jobs by their job id, whether they have started or not. Let's make a queue-info/ subdomain and routes file that has endpoints for check-status/:job_id, queue_status/ and cancel_job/:job_id endpoints that will do as their names suggest. The engineer shoudl assign the appropriate method to each endpoint.

## Implementation

The implementation of the worker-node project will be based on a todo list in a file called worker-node/docs/REQUIREMENTS_TODO.md with phases and tasks that have checkboxes in the style of `[ ]`. The implementing engineer will complete a phase and check off the tasks completed with `[x]` only after the tests pass. Once all the tests pass for the phase the engineer will commit changes.

## Tests

see the docs/TEST_IMPLEMENTATION_NODE.md document for guidance on implementing tests.

## Routes

The section headings are the name of the subdomian. If the engineer finds a conflict with the naming convention they should bring this up as an issue before proceeding. The file name pattern for the routes will be routes/[subdomain].py.

### queue-info/

This routes file will contain at least the check-status/:job_id, queue_status/ and cancel_job/:job_id endpoints as described earlier.

### request-google-rss/

The endpoints in this subdomain will be in a file routes/request-google-rss.py. There should be one endpoint that starts a job called POST /request-google-rss/start-job. This endpoint will search for the excel file that is stored in the path and file name in the .env variable named PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED.

The reference code for implementing this functionality can be found in the /Users/nick/Documents/NewsNexus10-OBE/NewsNexusRequesterGoogleRss04.

### semantic-scorer/

The endpoints in this subdomain will be in a file routes/semantic-scorer.py. There should be one endpoint that starts a job called POST /semantic-scorer/start-job. The NewsNexusSemanticScorer02 project made use of two .env vars that were redundant: PATH_TO_SEMANTIC_SCORER_DIR and PATH_TO_SEMANTIC_SCORER_KEYWORDS_EXCEL_FILE. Let's only use the PATH_TO_SEMANTIC_SCORER_DIR as the path to where files for this functionality. This directory will contain the NewsNexusSemanticScorerKeywords.xlsx file used to score the articles as well as any text files the NewsNexusSemanticScorer02 microservice created.
The reference code for implementing this functionality can be found in the /Users/nick/Documents/NewsNexus10-OBE/NewsNexusSemanticScorer02.

### state-assigner/

The endpoints in this subdomain will be in a file routes/state-assigner.py. There should be one endpoint that starts a job called POST /state-assigner/start-job.

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
