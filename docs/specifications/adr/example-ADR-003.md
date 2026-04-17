# ADR-003: Use PostgreSQL as primary data store

**Status:** Accepted
**Date:** 2026-03-27
**Source:** technical-requirements.yaml

## Context

The system requires sub-100ms query latency for user authentication lookups, ACID guarantees for transaction history, and the ability to scale to 10M users within 2 years. The data model includes complex relationships between users, workflows, and execution logs. Budget constraints favor open-source solutions over proprietary databases.

## Decision

We will use PostgreSQL 14+ as the primary data store, hosted on AWS RDS with automated backups and read replicas for high-traffic queries. All transactional data (users, workflows, executions) will be stored in a normalized relational schema.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| MySQL | Weaker support for JSON data types and full-text search compared to PostgreSQL |
| MongoDB | ACID guarantees across collections are complex; relational model is a better fit for workflow dependencies |
| DynamoDB | Vendor lock-in; higher cost at scale; limited query flexibility for complex joins |

## Consequences

### Positive
- ACID compliance ensures data integrity for critical workflow state transitions
- Rich JSON support (jsonb) allows flexible metadata storage without schema migrations
- Mature ecosystem with proven scalability (e.g., GitHub, Instagram use PostgreSQL)
- AWS RDS provides managed backups, monitoring, and automated failover

### Negative / Trade-offs
- Vertical scaling has limits; will need read replicas and connection pooling beyond 1M concurrent users
- PostgreSQL expertise required on team for query optimization and index tuning
- Full-text search is adequate but not as powerful as dedicated search engines (Elasticsearch)

### Risks
- Connection pool exhaustion under high traffic requires careful configuration (pgBouncer or RDS Proxy)
- Large-scale migrations (ALTER TABLE on multi-TB tables) require careful planning and downtime windows
