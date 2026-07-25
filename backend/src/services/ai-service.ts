import { Pool } from 'pg';

export class AIService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Quote Recommendation AI
  async recommendQuoteValues(workspaceId: string, clientId: string, productIds: string[]): Promise<any> {
    try {
      // Analyze historical pricing for similar quotes
      const historicalResult = await this.pool.query(
        `SELECT q.total_amount_minor, q.created_at
         FROM quote q
         WHERE q.workspace_id = $1 AND q.client_id = $2
         ORDER BY q.created_at DESC
         LIMIT 50`,
        [workspaceId, clientId]
      );

      if (historicalResult.rows.length === 0) {
        return {
          recommendedRange: { min: 0, max: 0 },
          confidence: 0,
          factors: ['No historical data available']
        };
      }

      const amounts = historicalResult.rows.map(r => parseFloat(r.total_amount_minor));
      const average = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
      const stdDev = Math.sqrt(amounts.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / amounts.length);

      // Calculate recommended range (±1 standard deviation)
      const recommendedMin = Math.max(0, average - stdDev);
      const recommendedMax = average + stdDev;

      // Analyze supplier performance
      const supplierPerformance = await this.analyzeSupplierPerformance(workspaceId, productIds);

      return {
        recommendedRange: {
          min: Math.round(recommendedMin),
          max: Math.round(recommendedMax),
          average: Math.round(average)
        },
        confidence: Math.min(95, 50 + historicalResult.rows.length), // Confidence based on data size
        factors: [
          `Based on ${historicalResult.rows.length} historical quotes`,
          `Standard deviation: ${stdDev.toFixed(2)}`,
          ...supplierPerformance.factors
        ]
      };
    } catch (error) {
      console.error('Error recommending quote values:', error);
      return {
        recommendedRange: { min: 0, max: 0 },
        confidence: 0,
        factors: ['Error calculating recommendations']
      };
    }
  }

  // Supplier Performance Analysis
  private async analyzeSupplierPerformance(workspaceId: string, productIds: string[]): Promise<any> {
    try {
      // Get supplier information for products
      const supplierResult = await this.pool.query(
        `SELECT DISTINCT s.id, s.name, s.rating, s.lead_time_days
         FROM supplier s
         JOIN product p ON s.id = p.supplier_id
         WHERE p.id = ANY($1) AND s.workspace_id = $2`,
        [productIds, workspaceId]
      );

      const factors: string[] = [];
      let averageRating = 0;
      let averageLeadTime = 0;

      if (supplierResult.rows.length > 0) {
        averageRating = supplierResult.rows.reduce((sum, s) => sum + (s.rating || 0), 0) / supplierResult.rows.length;
        averageLeadTime = supplierResult.rows.reduce((sum, s) => sum + (s.lead_time_days || 0), 0) / supplierResult.rows.length;

        factors.push(`Average supplier rating: ${averageRating.toFixed(1)}/5`);
        factors.push(`Average lead time: ${averageLeadTime.toFixed(0)} days`);
      }

      return {
        averageRating,
        averageLeadTime,
        factors
      };
    } catch (error) {
      console.error('Error analyzing supplier performance:', error);
      return {
        averageRating: 0,
        averageLeadTime: 0,
        factors: ['Error analyzing supplier performance']
      };
    }
  }

  // Risk Assessment AI
  async assessProjectRisk(projectId: string): Promise<any> {
    try {
      const projectResult = await this.pool.query(
        `SELECT p.*, c.name as client_name
         FROM project p
         JOIN client c ON p.client_id = c.id
         WHERE p.id = $1`,
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        return {
          riskLevel: 'unknown',
          riskScore: 0,
          factors: ['Project not found']
        };
      }

      const project = projectResult.rows[0];
      const riskFactors: string[] = [];
      let riskScore = 0;

      // Cost variance risk
      if (project.actual_cost_minor && project.estimated_cost_minor) {
        const costVariance = (project.actual_cost_minor - project.estimated_cost_minor) / project.estimated_cost_minor * 100;
        if (costVariance > 20) {
          riskScore += 30;
          riskFactors.push(`High cost variance: ${costVariance.toFixed(1)}%`);
        } else if (costVariance > 10) {
          riskScore += 15;
          riskFactors.push(`Moderate cost variance: ${costVariance.toFixed(1)}%`);
        }
      }

      // Timeline risk
      if (project.end_date && project.start_date && project.estimated_duration_days) {
        const actualDuration = Math.floor((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24));
        const durationVariance = (actualDuration - project.estimated_duration_days) / project.estimated_duration_days * 100;
        if (durationVariance > 20) {
          riskScore += 25;
          riskFactors.push(`Timeline overrun: ${durationVariance.toFixed(1)}%`);
        } else if (durationVariance > 10) {
          riskScore += 10;
          riskFactors.push(`Timeline delay: ${durationVariance.toFixed(1)}%`);
        }
      }

      // Client risk (based on historical performance)
      const clientRisk = await this.assessClientRisk(project.client_id);
      riskScore += clientRisk.riskScore;
      riskFactors.push(...clientRisk.factors);

      // Determine risk level
      let riskLevel = 'low';
      if (riskScore >= 70) {
        riskLevel = 'critical';
      } else if (riskScore >= 50) {
        riskLevel = 'high';
      } else if (riskScore >= 30) {
        riskLevel = 'medium';
      }

      return {
        riskLevel,
        riskScore: Math.min(100, riskScore),
        factors: riskFactors,
        recommendations: this.generateRiskRecommendations(riskLevel, riskFactors)
      };
    } catch (error) {
      console.error('Error assessing project risk:', error);
      return {
        riskLevel: 'unknown',
        riskScore: 0,
        factors: ['Error assessing risk']
      };
    }
  }

  // Client Risk Assessment
  private async assessClientRisk(clientId: string): Promise<any> {
    try {
      const clientResult = await this.pool.query(
        `SELECT COUNT(*) as total_projects,
                AVG(p.cost_variance_percentage) as avg_cost_variance,
                AVG(p.duration_variance_percentage) as avg_duration_variance
         FROM project p
         WHERE p.client_id = $1`,
        [clientId]
      );

      const clientData = clientResult.rows[0];
      const riskScore = 0;
      const factors: string[] = [];

      if (clientData.avg_cost_variance && parseFloat(clientData.avg_cost_variance) > 15) {
        riskScore += 20;
        factors.push(`High cost variance: ${parseFloat(clientData.avg_cost_variance).toFixed(1)}%`);
      }

      if (clientData.avg_duration_variance && parseFloat(clientData.avg_duration_variance) > 15) {
        riskScore += 15;
        factors.push(`High timeline variance: ${parseFloat(clientData.avg_duration_variance).toFixed(1)}%`);
      }

      return {
        riskScore,
        factors
      };
    } catch (error) {
      console.error('Error assessing client risk:', error);
      return {
        riskScore: 0,
        factors: ['Error assessing client risk']
      };
    }
  }

  // Generate Risk Recommendations
  private generateRiskRecommendations(riskLevel: string, factors: string[]): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Implement enhanced monitoring');
      recommendations.push('Review project scope and requirements');
      recommendations.push('Increase contingency budget');
      recommendations.push('Add buffer to timeline estimates');
    }

    if (riskLevel === 'medium') {
      recommendations.push('Regular progress reviews');
      recommendations.push('Monitor key performance indicators');
      recommendations.push('Maintain contingency reserves');
    }

    if (factors.some(f => f.includes('cost variance'))) {
      recommendations.push('Review cost estimation methodology');
      recommendations.push('Implement cost tracking procedures');
    }

    if (factors.some(f => f.includes('timeline'))) {
      recommendations.push('Improve project scheduling');
      recommendations.push('Add milestones for better tracking');
    }

    return recommendations;
  }

  // Cost Overrun Prediction
  async predictCostOverrun(projectId: string): Promise<any> {
    try {
      const projectResult = await this.pool.query(
        `SELECT p.*, 
                (SELECT AVG(cost_variance_percentage) 
                 FROM project 
                 WHERE client_id = p.client_id AND cost_variance_percentage IS NOT NULL) as client_avg_variance
         FROM project p
         WHERE p.id = $1`,
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        return {
          prediction: 'unknown',
          probability: 0,
          factors: ['Project not found']
        };
      }

      const project = projectResult.rows[0];
      const factors: string[] = [];
      let overrunProbability = 0;

      // Historical client performance
      if (project.client_avg_variance) {
        const clientVariance = parseFloat(project.client_avg_variance);
        if (clientVariance > 20) {
          overrunProbability += 40;
          factors.push(`Client historical cost variance: ${clientVariance.toFixed(1)}%`);
        } else if (clientVariance > 10) {
          overrunProbability += 20;
          factors.push(`Client historical cost variance: ${clientVariance.toFixed(1)}%`);
        }
      }

      // Project complexity (based on duration and team size)
      if (project.estimated_duration_days > 90) {
        overrunProbability += 15;
        factors.push('Long project duration increases risk');
      }

      // Current project status
      if (project.status === 'at_risk') {
        overrunProbability += 25;
        factors.push('Project already marked as at risk');
      }

      // Determine prediction
      let prediction = 'low';
      if (overrunProbability >= 70) {
        prediction = 'high';
      } else if (overrunProbability >= 40) {
        prediction = 'medium';
      }

      return {
        prediction,
        probability: Math.min(100, overrunProbability),
        factors,
        estimatedOverrun: this.calculateEstimatedOverrun(project, overrunProbability)
      };
    } catch (error) {
      console.error('Error predicting cost overrun:', error);
      return {
        prediction: 'unknown',
        probability: 0,
        factors: ['Error predicting cost overrun']
      };
    }
  }

  // Calculate Estimated Overrun
  private calculateEstimatedOverrun(project: any, probability: number): any {
    if (!project.estimated_cost_minor) {
      return { amount: 0, percentage: 0 };
    }

    const estimatedCost = parseFloat(project.estimated_cost_minor);
    const estimatedPercentage = (probability / 100) * 20; // Max 20% overrun estimate
    const estimatedAmount = estimatedCost * (estimatedPercentage / 100);

    return {
      amount: Math.round(estimatedAmount),
      percentage: estimatedPercentage.toFixed(1)
    };
  }

  // AI-Powered Insights
  async generateInsights(workspaceId: string): Promise<any> {
    try {
      const insights: any[] = [];

      // Quote performance insights
      const quoteInsights = await this.generateQuoteInsights(workspaceId);
      insights.push(...quoteInsights);

      // Project performance insights
      const projectInsights = await this.generateProjectInsights(workspaceId);
      insights.push(...projectInsights);

      // Client performance insights
      const clientInsights = await this.generateClientInsights(workspaceId);
      insights.push(...clientInsights);

      return {
        insights,
        generatedAt: new Date().toISOString(),
        confidence: 75 // Default confidence for rule-based insights
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      return {
        insights: [],
        generatedAt: new Date().toISOString(),
        confidence: 0
      };
    }
  }

  // Generate Quote Insights
  private async generateQuoteInsights(workspaceId: string): Promise<any[]> {
    const insights: any[] = [];

    try {
      // Find top performing clients
      const topClients = await this.pool.query(
        `SELECT c.name, COUNT(q.id) as quote_count, AVG(q.total_amount_minor) as avg_value
         FROM client c
         JOIN quote q ON c.id = q.client_id
         WHERE c.workspace_id = $1 AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE)
         GROUP BY c.id, c.name
         ORDER BY avg_value DESC
         LIMIT 3`,
        [workspaceId]
      );

      if (topClients.rows.length > 0) {
        insights.push({
          type: 'opportunity',
          title: 'Top Performing Clients',
          description: `Focus on ${topClients.rows[0].name} with average quote value of $${(parseFloat(topClients.rows[0].avg_value) / 100).toFixed(2)}`,
          priority: 'high'
        });
      }

      // Find declining conversion rates
      const conversionTrend = await this.pool.query(
        `SELECT 
           EXTRACT(MONTH FROM q.created_at) as month,
           COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as conversion_rate
         FROM quote q
         LEFT JOIN project p ON q.id = p.quote_id
         WHERE q.workspace_id = $1 AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
         GROUP BY EXTRACT(MONTH FROM q.created_at)
         ORDER BY month`,
        [workspaceId]
      );

      if (conversionTrend.rows.length > 1) {
        const rates = conversionTrend.rows.map(r => parseFloat(r.conversion_rate));
        const isDeclining = rates[rates.length - 1] < rates[0];

        if (isDeclining) {
          insights.push({
            type: 'warning',
            title: 'Declining Conversion Rate',
            description: 'Quote conversion rate has declined over the past 3 months',
            priority: 'medium'
          });
        }
      }
    } catch (error) {
      console.error('Error generating quote insights:', error);
    }

    return insights;
  }

  // Generate Project Insights
  private async generateProjectInsights(workspaceId: string): Promise<any[]> {
    const insights: any[] = [];

    try {
      // Find projects at risk
      const atRiskProjects = await this.pool.query(
        `SELECT COUNT(*) as count
         FROM project
         WHERE workspace_id = $1 AND status = 'at_risk'`,
        [workspaceId]
      );

      if (parseInt(atRiskProjects.rows[0].count) > 0) {
        insights.push({
          type: 'alert',
          title: 'Projects at Risk',
          description: `${atRiskProjects.rows[0].count} projects are currently marked as at risk`,
          priority: 'high'
        });
      }

      // Find projects with cost overruns
      const overrunProjects = await this.pool.query(
        `SELECT COUNT(*) as count
         FROM project
         WHERE workspace_id = $1 AND cost_variance_percentage > 10`,
        [workspaceId]
      );

      if (parseInt(overrunProjects.rows[0].count) > 0) {
        insights.push({
          type: 'warning',
          title: 'Cost Overruns Detected',
          description: `${overrunProjects.rows[0].count} projects have cost variances exceeding 10%`,
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Error generating project insights:', error);
    }

    return insights;
  }

  // Generate Client Insights
  private async generateClientInsights(workspaceId: string): Promise<any[]> {
    const insights: any[] = [];

    try {
      // Find inactive clients
      const inactiveClients = await this.pool.query(
        `SELECT COUNT(*) as count
         FROM client c
         WHERE c.workspace_id = $1 
         AND NOT EXISTS (
           SELECT 1 FROM quote q WHERE q.client_id = c.id AND q.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
         )`,
        [workspaceId]
      );

      if (parseInt(inactiveClients.rows[0].count) > 0) {
        insights.push({
          type: 'opportunity',
          title: 'Inactive Clients',
          description: `${inactiveClients.rows[0].count} clients have had no activity in the past 3 months`,
          priority: 'low'
        });
      }
    } catch (error) {
      console.error('Error generating client insights:', error);
    }

    return insights;
  }
}