# Future Scaling Report

The current implementation is intentionally a single-service architecture for faster development, easier debugging, and interview readiness.

## Explicitly Skipped in Implementation
- Video Calling
- Voice Calling
- Kafka
- Kubernetes
- Microservices
- Redis Clustering
- Message Queue

## Why They Were Skipped
- Scope control: core chat product is complete without increasing operational complexity.
- Interview value: authentication + realtime messaging + persistence + status flow already demonstrate strong full-stack and system thinking.
- Time-to-delivery: avoids infrastructure overhead and keeps the code understandable.

## Production-Scale Upgrade Path

### 1. Horizontal Scaling for Socket.IO
- Run multiple Node.js instances behind a load balancer.
- Use Redis Pub/Sub adapter for Socket.IO cross-instance event propagation.

### 2. Async Workloads with Queue
- Add message queue (Kafka/RabbitMQ/SQS) for non-blocking features:
  - notifications
  - analytics
  - moderation
  - export jobs

### 3. Service Decomposition
- Split into microservices once team/project size grows:
  - auth service
  - chat service
  - media service
  - notification service

### 4. Realtime Voice/Video
- Add WebRTC signaling through Socket.IO.
- Use TURN/STUN services for NAT traversal.

### 5. Kubernetes + Observability
- Container orchestration with autoscaling and rolling updates.
- Add centralized logs, metrics, tracing, and health probes.

## Message Status State Machine

```text
sent -> delivered -> seen
```

This state machine is already implemented and is a strong foundation for future event-driven enhancements.
