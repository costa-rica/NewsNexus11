# News Nexus 11 - Monorepo

This project is the monorepo of applicaitons that are part of the News Nexus 10 ecosystem. The focus is the website / database which includes the API / NextJS frontend, and custom database package. The News Nexus project makes use of node.js and python services. This mono repo will incorporate these microservices in queueing APIs one for Node.js app and another for Python apps, respectivly named: worker-node/ and worker-python.

## Transition

This project will include
The NewsNexusPythonQueuer was the Python Flask API that queued the deduper (NewsNexusDeduper02). This workflow will be integrated into the worker-python/ subproject in the

and was intended to queue jobs for the location classifier (NewsNexusClassifierLocationScorer01) two Python micro servcies.

Other node.js microservices were triggered manually.

## Directory Structure

```
.
├── AGENT.md                        - AI assistant guidance for this monorepo
├── README.md
├── api/                            - Express.js REST API (TypeScript)
│   ├── src/
│   └── package.json
├── db-models/                      - Shared Sequelize models (@newsnexus/db)
│   ├── src/
│   └── package.json
├── docs/                           - Project-wide documentation
│   ├── PROJECT_OVERVIEW.md
│   ├── api-documentation/          - Per-route API docs
│   ├── images/
│   ├── references/
│   ├── requirements/
│   └── transition-to-newsnexus11/
├── portal/                         - Next.js frontend
│   ├── components/
│   ├── pages/
│   └── package.json
├── worker-python/                  - Python API queueing service
│   ├── src/
│   └── requirements.txt
└── worker-node/                    - ExpressJS / queueing service
    ├── src/
    └── package.json
```
