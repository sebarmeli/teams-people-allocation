import chalk from 'chalk';
import { table } from 'table';

export class ResultsDisplay {
  constructor() {}

  displayResults(report) {
    console.clear();
    console.log(chalk.bold.cyan('\n🎯 TEAM ALLOCATION OPTIMIZATION RESULTS\n'));
    
    this.displaySummary(report.summary);
    this.displayTeamAllocation(report.teamMembers);
    this.displayProjectStatus(report.itemsByStatus);
    this.displayRecommendations(report.recommendations);
  }

  displaySummary(summary) {
    console.log(chalk.bold.yellow('📊 ALLOCATION SUMMARY'));
    console.log('─'.repeat(50));
    
    const data = [
      ['Total Team Capacity', `${summary.totalTeamCapacity} FTE`],
      ['Allocated Capacity', `${summary.totalAllocatedCapacity} FTE`],
      ['Utilization Rate', `${summary.utilizationRate}%`],
      ['Total Projects', summary.itemsCount],
      ['Fully Staffed Projects', summary.fullyStaffedCount]
    ];

    const config = {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│'
      },
      columnDefault: {
        paddingLeft: 1,
        paddingRight: 1
      }
    };

    console.log(table(data, config));
  }

  displayTeamAllocation(teamMembers) {
    console.log(chalk.bold.yellow('👥 TEAM MEMBER ALLOCATIONS'));
    console.log('─'.repeat(50));

    const headers = ['Name', 'Capacity', 'Allocated', 'Utilization', 'Projects'];
    const rows = [headers];

    for (const member of teamMembers) {
      const utilization = Math.round((member.allocatedCapacity / member.capacity) * 100);
      const utilizationColor = this.getUtilizationColor(utilization);
      const projects = member.assignments ? 
        member.assignments.map(a => `${a.item} (${a.percentage}%)`).join(', ') : 
        'None';

      rows.push([
        member.name,
        `${Math.round(member.capacity * 100)}%`,
        `${Math.round(member.allocatedCapacity * 100)}%`,
        utilizationColor(`${utilization}%`),
        projects || 'None'
      ]);
    }

    const config = {
      header: {
        alignment: 'center',
        content: chalk.bold
      },
      columnDefault: {
        paddingLeft: 1,
        paddingRight: 1,
        wrapWord: true
      },
      columns: {
        4: { width: 40 }
      }
    };

    console.log(table(rows, config));
  }

  displayProjectStatus(itemsByStatus) {
    console.log(chalk.bold.yellow('📋 PROJECT STATUS BREAKDOWN'));
    console.log('─'.repeat(50));

    const statusConfig = {
      'fully-staffed': { color: 'green', icon: '✅', label: 'Fully Staffed' },
      'adequately-staffed': { color: 'blue', icon: '🔵', label: 'Adequately Staffed' },
      'under-staffed': { color: 'yellow', icon: '⚠️', label: 'Under Staffed' },
      'not-staffed': { color: 'red', icon: '❌', label: 'Not Staffed' }
    };

    for (const [status, items] of Object.entries(itemsByStatus)) {
      if (items.length === 0) continue;

      const config = statusConfig[status];
      console.log(chalk[config.color].bold(`\n${config.icon} ${config.label.toUpperCase()} (${items.length})`));
      
      const headers = ['Project', 'Size', 'Complexity', 'Required Skills', 'Team'];
      const rows = [headers];

      for (const item of items) {
        const team = item.assignedMembers ? 
          item.assignedMembers.map(a => `${a.member} (${a.percentage}%)`).join(', ') :
          'None assigned';

        rows.push([
          item.name,
          this.getSizeLabel(item.size),
          this.getComplexityLabel(item.complexity),
          item.requiredSkills.join(', ') || 'None specified',
          team
        ]);
      }

      const tableConfig = {
        columnDefault: {
          paddingLeft: 1,
          paddingRight: 1,
          wrapWord: true
        },
        columns: {
          0: { width: 20 },
          3: { width: 25 },
          4: { width: 30 }
        }
      };

      console.log(table(rows, tableConfig));
    }
  }

  displayRecommendations(recommendations) {
    console.log(chalk.bold.yellow('\n💡 RECOMMENDATIONS'));
    console.log('─'.repeat(50));

    const typeConfig = {
      'success': { color: 'green', icon: '✅' },
      'opportunity': { color: 'blue', icon: '💡' },
      'caution': { color: 'yellow', icon: '⚠️' },
      'warning': { color: 'orange', icon: '🟠' },
      'risk': { color: 'red', icon: '🚨' }
    };

    for (const rec of recommendations) {
      const config = typeConfig[rec.type] || { color: 'white', icon: '•' };
      console.log(chalk[config.color](`${config.icon} ${rec.message}`));
    }
    
    console.log('\n');
  }

  getUtilizationColor(utilization) {
    if (utilization < 50) return chalk.blue;
    if (utilization < 80) return chalk.green;
    if (utilization < 95) return chalk.yellow;
    return chalk.red;
  }

  getSizeLabel(size) {
    const labels = {
      1: 'XS', 2: 'S', 3: 'M', 4: 'L', 5: 'XL'
    };
    return labels[size] || size;
  }

  getComplexityLabel(complexity) {
    const labels = {
      1: 'Very Low', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'Very High'
    };
    return labels[complexity] || complexity;
  }

  displayWelcome() {
    console.clear();
    console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════════╗
║        TEAM ALLOCATION OPTIMIZER          ║
║                                           ║
║  Optimize your team's quarterly roadmap   ║
║    based on size, interest & complexity   ║
╚═══════════════════════════════════════════╝
    `));
  }
}