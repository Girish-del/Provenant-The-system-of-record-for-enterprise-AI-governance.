/**
 * OpenTelemetry bootstrap (B9). Must be imported before any other module so
 * auto-instrumentation can patch http/express/prisma. Activates only when
 * OTEL_EXPORTER_OTLP_ENDPOINT is set (e.g. a local collector or Grafana/Honeycomb
 * OTLP HTTP endpoint); otherwise it stays a no-op, matching the keyless-dev
 * pattern used across the platform.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (endpoint) {
  const sdk = new NodeSDK({
    serviceName: 'aegis-api',
    traceExporter: new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs instrumentation is noisy and rarely useful for an HTTP API
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });
  sdk.start();
  process.on('SIGTERM', () => {
    void sdk.shutdown();
  });
  // eslint-disable-next-line no-console
  console.log(`[otel] tracing on -> ${endpoint}`);
} else {
  // eslint-disable-next-line no-console
  console.log('[otel] noop (set OTEL_EXPORTER_OTLP_ENDPOINT to enable)');
}
