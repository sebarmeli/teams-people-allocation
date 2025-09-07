import inquirer from 'inquirer';
import { TeamMember, RoadmapItem } from './models.js';

export class InputCollector {
  constructor() {
    this.teamMembers = [];
    this.roadmapItems = [];
  }

  async collectTeamMembers() {
    console.log('\n🧑‍💻 Let\'s collect information about your team members...\n');
    
    let addingMembers = true;
    while (addingMembers) {
      const memberData = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Team member name:',
          validate: input => input.trim() ? true : 'Name cannot be empty'
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
        }
      ]);

      const member = new TeamMember(
        memberData.name,
        memberData.skills,
        memberData.capacity,
        memberData.interests
      );
      
      this.teamMembers.push(member);
      console.log(`✅ Added ${member.name} to the team\n`);

      const continuePrompt = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addAnother',
          message: 'Add another team member?',
          default: true
        }
      ]);

      addingMembers = continuePrompt.addAnother;
    }

    return this.teamMembers;
  }

  async collectRoadmapItems() {
    console.log('\n📋 Now let\'s collect your roadmap items for the quarter...\n');
    
    let addingItems = true;
    while (addingItems) {
      const itemData = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Project/item name:',
          validate: input => input.trim() ? true : 'Name cannot be empty'
        },
        {
          type: 'input',
          name: 'description',
          message: 'Brief description:'
        },
        {
          type: 'list',
          name: 'size',
          message: 'Project size:',
          choices: [
            { name: '1 - Very Small (few days)', value: 1 },
            { name: '2 - Small (1-2 weeks)', value: 2 },
            { name: '3 - Medium (3-6 weeks)', value: 3 },
            { name: '4 - Large (2-3 months)', value: 4 },
            { name: '5 - Very Large (entire quarter)', value: 5 }
          ]
        },
        {
          type: 'list',
          name: 'complexity',
          message: 'Project complexity:',
          choices: [
            { name: '1 - Very Simple (routine work)', value: 1 },
            { name: '2 - Simple (well-understood)', value: 2 },
            { name: '3 - Moderate (some unknowns)', value: 3 },
            { name: '4 - Complex (many unknowns)', value: 4 },
            { name: '5 - Very Complex (research/experimental)', value: 5 }
          ]
        },
        {
          type: 'input',
          name: 'requiredSkills',
          message: 'Required skills (comma-separated):',
          filter: input => input.split(',').map(s => s.trim()).filter(s => s)
        },
        {
          type: 'input',
          name: 'domain',
          message: 'Domain/area (e.g., frontend, backend, data, mobile):',
        }
      ]);

      const item = new RoadmapItem(
        itemData.name,
        itemData.description,
        itemData.size,
        itemData.complexity,
        itemData.requiredSkills,
        itemData.domain
      );
      
      this.roadmapItems.push(item);
      console.log(`✅ Added "${item.name}" to the roadmap\n`);

      const continuePrompt = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addAnother',
          message: 'Add another roadmap item?',
          default: true
        }
      ]);

      addingItems = continuePrompt.addAnother;
    }

    return this.roadmapItems;
  }

  async collectAllData() {
    await this.collectTeamMembers();
    await this.collectRoadmapItems();
    
    return {
      teamMembers: this.teamMembers,
      roadmapItems: this.roadmapItems
    };
  }
}