#!/usr/bin/env node

import { InputCollector } from './input.js';
import { AllocationOptimizer } from './optimizer.js';
import { ResultsDisplay } from './display.js';
import { TeamMember } from './models.js';
import inquirer from 'inquirer';

class TeamAllocationApp {
  constructor() {
    this.display = new ResultsDisplay();
    this.inputCollector = new InputCollector();
  }

  async run() {
    try {
      this.display.displayWelcome();
      
      // Show main menu
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🚀 Run Full Allocation Optimization', value: 'optimize' },
            { name: '👥 Manage Team Members', value: 'manage-team' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      switch (action) {
        case 'optimize':
          await this.runOptimization();
          break;
        case 'manage-team':
          await this.manageTeamMembers();
          break;
        case 'exit':
          console.log('\n👋 Thank you for using Team Allocation Optimizer!');
          break;
      }

    } catch (error) {
      console.error('❌ An error occurred:', error.message);
      process.exit(1);
    }
  }

  async runOptimization() {
    // Collect input data
    console.log('Welcome to the Team Allocation Optimizer!');
    console.log('This tool will help you optimally allocate team members to roadmap items');
    console.log('based on project size, complexity, required skills, and team member interests.\n');

    const { teamMembers, roadmapItems } = await this.inputCollector.collectAllData();

    if (teamMembers.length === 0) {
      console.log('❌ No team members added. Cannot proceed with allocation.');
      return;
    }

    if (roadmapItems.length === 0) {
      console.log('❌ No roadmap items added. Cannot proceed with allocation.');
      return;
    }

    // Optimize allocation
    console.log('\n🔄 Optimizing allocation...\n');
    const optimizer = new AllocationOptimizer(teamMembers, roadmapItems);
    const report = optimizer.optimize();

    // Display results
    this.display.displayResults(report);

    // Offer additional options
    await this.offerAdditionalOptions(report);
  }

  async manageTeamMembers() {
    console.log('\n👥 TEAM MEMBER MANAGEMENT\n');
    
    let managing = true;
    while (managing) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '➕ Add New Team Member', value: 'add' },
            { name: '📋 View All Team Members', value: 'view' },
            { name: '🔙 Back to Main Menu', value: 'back' }
          ]
        }
      ]);

      switch (action) {
        case 'add':
          await this.addSingleTeamMember();
          break;
        case 'view':
          await this.viewTeamMembers();
          break;
        case 'back':
          managing = false;
          await this.run();
          break;
      }
    }
  }

  async addSingleTeamMember() {
    console.log('\n➕ Adding New Team Member\n');

    const memberData = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Team member name:',
        validate: input => input.trim() ? true : 'Name cannot be empty'
      },
      {
        type: 'list',
        name: 'level',
        message: 'Experience level:',
        choices: [
          { name: 'Intern', value: 'Intern' },
          { name: 'Junior', value: 'Junior' },
          { name: 'Mid', value: 'Mid' },
          { name: 'Senior', value: 'Senior' },
          { name: 'Staff', value: 'Staff' },
          { name: 'Principal', value: 'Principal' },
          { name: 'Architect', value: 'Architect' }
        ],
        default: 'Mid'
      },
      {
        type: 'input',
        name: 'skills',
        message: 'Skills (comma-separated):',
        filter: input => input.split(',').map(s => s.trim()).filter(s => s)
      },
      {
        type: 'number',
        name: 'capacity',
        message: 'Capacity for this quarter (0.0 to 1.0):',
        default: 1.0,
        validate: input => (input >= 0 && input <= 1) ? true : 'Capacity must be between 0.0 and 1.0'
      },
      {
        type: 'input',
        name: 'interests',
        message: 'Areas of interest (comma-separated):',
        filter: input => input.split(',').map(s => s.trim()).filter(s => s)
      },
      {
        type: 'input',
        name: 'careerGoals',
        message: 'Career goals (comma-separated):',
        filter: input => input.split(',').map(s => s.trim()).filter(s => s)
      }
    ]);

    const member = new TeamMember(
      memberData.name,
      memberData.level,
      memberData.skills,
      memberData.capacity,
      memberData.interests,
      memberData.careerGoals
    );

    // Save to a simple JSON file for persistence
    await this.saveTeamMember(member);
    
    console.log(`\n✅ Successfully added ${member.name} to the team!`);
    console.log(`   Level: ${member.level}`);
    console.log(`   Skills: ${member.skills.join(', ')}`);
    console.log(`   Capacity: ${member.capacity}`);
    console.log(`   Interests: ${member.interests.join(', ')}`);
    console.log(`   Career Goals: ${member.careerGoals.join(', ')}\n`);

    const { addAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addAnother',
        message: 'Add another team member?',
        default: false
      }
    ]);

    if (addAnother) {
      await this.addSingleTeamMember();
    }
  }

  async saveTeamMember(member) {
    const fs = await import('fs');
    const path = await import('path');
    
    const dataFile = 'team-members.json';
    let teamMembers = [];

    try {
      if (fs.existsSync(dataFile)) {
        const data = fs.readFileSync(dataFile, 'utf8');
        teamMembers = JSON.parse(data);
      }
    } catch (error) {
      console.log('Creating new team members file...');
    }

    teamMembers.push({
      name: member.name,
      level: member.level,
      skills: member.skills,
      capacity: member.capacity,
      interests: member.interests,
      careerGoals: member.careerGoals,
      dateAdded: new Date().toISOString()
    });

    fs.writeFileSync(dataFile, JSON.stringify(teamMembers, null, 2));
  }

  async viewTeamMembers() {
    console.log('\n📋 CURRENT TEAM MEMBERS\n');
    
    const fs = await import('fs');
    const dataFile = 'team-members.json';

    try {
      if (!fs.existsSync(dataFile)) {
        console.log('❌ No team members found. Add some team members first.');
        return;
      }

      const data = fs.readFileSync(dataFile, 'utf8');
      const teamMembers = JSON.parse(data);

      if (teamMembers.length === 0) {
        console.log('❌ No team members found. Add some team members first.');
        return;
      }

      teamMembers.forEach((member, index) => {
        console.log(`${index + 1}. ${member.name}`);
        console.log(`   Level: ${member.level}`);
        console.log(`   Skills: ${member.skills.join(', ') || 'None specified'}`);
        console.log(`   Capacity: ${member.capacity}`);
        console.log(`   Interests: ${member.interests.join(', ') || 'None specified'}`);
        console.log(`   Career Goals: ${member.careerGoals.join(', ') || 'None specified'}`);
        console.log(`   Added: ${new Date(member.dateAdded).toLocaleDateString()}`);
        console.log('');
      });

      console.log(`Total team members: ${teamMembers.length}\n`);

    } catch (error) {
      console.error('❌ Error reading team members:', error.message);
    }
  }

  async offerAdditionalOptions(report) {
    const choices = [
      { name: '📊 View detailed breakdown', value: 'detailed' },
      { name: '📁 Export to JSON', value: 'export' },
      { name: '🔄 Run new allocation', value: 'restart' },
      { name: '❌ Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do next?',
        choices: choices
      }
    ]);

    switch (action) {
      case 'detailed':
        this.showDetailedBreakdown(report);
        await this.offerAdditionalOptions(report);
        break;
      case 'export':
        await this.exportToJSON(report);
        await this.offerAdditionalOptions(report);
        break;
      case 'restart':
        await this.run();
        break;
      case 'exit':
        console.log('\n👋 Thank you for using Team Allocation Optimizer!');
        break;
    }
  }

  showDetailedBreakdown(report) {
    console.log('\n📊 DETAILED BREAKDOWN\n');
    
    console.log('🏗️  CAPACITY ANALYSIS:');
    console.log(`• Total team capacity: ${report.summary.totalTeamCapacity} FTE`);
    console.log(`• Allocated capacity: ${report.summary.totalAllocatedCapacity} FTE`);
    console.log(`• Unallocated capacity: ${(report.summary.totalTeamCapacity - report.summary.totalAllocatedCapacity).toFixed(2)} FTE`);
    
    if (report.underUtilized.length > 0) {
      console.log('\n⬇️  UNDER-UTILIZED TEAM MEMBERS:');
      report.underUtilized.forEach(member => {
        const utilization = Math.round((member.allocatedCapacity / member.capacity) * 100);
        console.log(`• ${member.name}: ${utilization}% utilized`);
      });
    }

    if (report.overUtilized.length > 0) {
      console.log('\n⬆️  OVER-UTILIZED TEAM MEMBERS:');
      report.overUtilized.forEach(member => {
        const utilization = Math.round((member.allocatedCapacity / member.capacity) * 100);
        console.log(`• ${member.name}: ${utilization}% utilized`);
      });
    }

    if (report.itemsByStatus['not-staffed'].length > 0) {
      console.log('\n❌ UNSTAFFED PROJECTS:');
      report.itemsByStatus['not-staffed'].forEach(item => {
        console.log(`• ${item.name} (Size: ${item.size}, Complexity: ${item.complexity})`);
      });
    }

    console.log('\n');
  }

  async exportToJSON(report) {
    const fs = await import('fs');
    
    const exportData = {
      timestamp: new Date().toISOString(),
      summary: report.summary,
      teamMembers: report.teamMembers.map(member => ({
        name: member.name,
        skills: member.skills,
        interests: member.interests,
        capacity: member.capacity,
        allocatedCapacity: member.allocatedCapacity,
        utilization: Math.round((member.allocatedCapacity / member.capacity) * 100),
        assignments: member.assignments || []
      })),
      roadmapItems: report.roadmapItems.map(item => ({
        name: item.name,
        description: item.description,
        size: item.size,
        complexity: item.complexity,
        requiredSkills: item.requiredSkills,
        domain: item.domain,
        priority: item.priority,
        allocationStatus: item.allocationStatus,
        assignedMembers: item.assignedMembers || []
      })),
      recommendations: report.recommendations
    };

    const filename = `allocation-report-${new Date().toISOString().split('T')[0]}.json`;
    
    try {
      fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
      console.log(`✅ Report exported to ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to export report: ${error.message}`);
    }
  }
}

// Run the application
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = new TeamAllocationApp();
  app.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}