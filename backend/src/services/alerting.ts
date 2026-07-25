import logger from '../config/logging';

interface AlertRule {
  name: string;
  condition: (metrics: any) => boolean;
  threshold: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

interface Alert {
  id: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metrics: any;
}

class AlertingService {
  private alertRules: AlertRule[] = [];
  private alertHistory: Alert[] = [];
  private maxAlertHistory: number = 1000;
  private alertCooldowns: Map<string, number> = new Map();
  private cooldownPeriod: number = 300000; // 5 minutes in milliseconds

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.alertRules = [
      {
        name: 'high_response_time',
        condition: (metrics) => metrics.averageResponseTime > 1000,
        threshold: 1000,
        message: 'Average response time exceeds 1 second',
        severity: 'warning',
        enabled: true
      },
      {
        name: 'high_error_rate',
        condition: (metrics) => metrics.errorRate > 5,
        threshold: 5,
        message: 'Error rate exceeds 5%',
        severity: 'critical',
        enabled: true
      },
      {
        name: 'high_p99_response_time',
        condition: (metrics) => metrics.p99ResponseTime > 2000,
        threshold: 2000,
        message: 'P99 response time exceeds 2 seconds',
        severity: 'warning',
        enabled: true
      },
      {
        name: 'slow_requests_count',
        condition: (metrics) => metrics.slowRequests > 10,
        threshold: 10,
        message: 'More than 10 slow requests detected',
        severity: 'warning',
        enabled: true
      },
      {
        name: 'critical_error_rate',
        condition: (metrics) => metrics.errorRate > 10,
        threshold: 10,
        message: 'Error rate exceeds 10%',
        severity: 'critical',
        enabled: true
      }
    ];
  }

  checkAlerts(metrics: any): Alert[] {
    const triggeredAlerts: Alert[] = [];
    const now = Date.now();

    this.alertRules.forEach(rule => {
      if (!rule.enabled) {
        return;
      }

      // Check cooldown period
      const lastAlertTime = this.alertCooldowns.get(rule.name);
      if (lastAlertTime && (now - lastAlertTime) < this.cooldownPeriod) {
        return;
      }

      if (rule.condition(metrics)) {
        const alert: Alert = {
          id: `${rule.name}-${now}`,
          ruleName: rule.name,
          severity: rule.severity,
          message: rule.message,
          timestamp: new Date(),
          metrics
        };

        triggeredAlerts.push(alert);
        this.alertHistory.push(alert);
        this.alertCooldowns.set(rule.name, now);

        logger.warn({
          rule: rule.name,
          severity: rule.severity,
          metrics
        }, `Alert triggered: ${rule.message}`);
      }
    });

    // Maintain alert history size
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory.shift();
    }

    return triggeredAlerts;
  }

  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  getAlertRules(): AlertRule[] {
    return this.alertRules;
  }

  updateAlertRule(name: string, updates: Partial<AlertRule>): void {
    const ruleIndex = this.alertRules.findIndex(r => r.name === name);
    if (ruleIndex !== -1) {
      this.alertRules[ruleIndex] = {
        ...this.alertRules[ruleIndex],
        ...updates
      };
      logger.info({ rule: name, updates }, 'Alert rule updated');
    }
  }

  enableAlertRule(name: string): void {
    const rule = this.alertRules.find(r => r.name === name);
    if (rule) {
      rule.enabled = true;
      logger.info({ rule: name }, 'Alert rule enabled');
    }
  }

  disableAlertRule(name: string): void {
    const rule = this.alertRules.find(r => r.name === name);
    if (rule) {
      rule.enabled = false;
      logger.info({ rule: name }, 'Alert rule disabled');
    }
  }

  clearAlertHistory(): void {
    this.alertHistory = [];
    logger.info('Alert history cleared');
  }

  getAlertSummary(): {
    info: number,
    warning: number,
    critical: number
  } {
    const summary = {
      info: 0,
      warning: 0,
      critical: 0
    };

    this.alertHistory.forEach(alert => {
      summary[alert.severity]++;
    });

    return summary;
  }
}

// Singleton instance
const alertingService = new AlertingService();

export default alertingService;