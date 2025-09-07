export class TeamMember {
  constructor(name, level = 'Mid', skills = [], capacity = 1.0, interests = [], careerGoals = []) {
    this.name = name;
    this.level = level; // Junior, Mid, Senior, Staff, Principal, etc.
    this.skills = skills; // Array of skill strings
    this.capacity = capacity; // 0.0 to 1.0 (percentage of time available)
    this.interests = interests; // Array of interest areas
    this.careerGoals = careerGoals; // What they are looking for in their career
    this.allocatedCapacity = 0.0; // Track how much capacity is already allocated
  }

  getAvailableCapacity() {
    return Math.max(0, this.capacity - this.allocatedCapacity);
  }

  hasSkill(skill) {
    return this.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()) || 
                              skill.toLowerCase().includes(s.toLowerCase()));
  }

  hasInterest(area) {
    return this.interests.some(i => i.toLowerCase().includes(area.toLowerCase()) || 
                                   area.toLowerCase().includes(i.toLowerCase()));
  }

  hasCareerGoal(goal) {
    return this.careerGoals.some(g => g.toLowerCase().includes(goal.toLowerCase()) || 
                                     goal.toLowerCase().includes(g.toLowerCase()));
  }

  getLevelWeight() {
    // Higher weight for more senior levels (for complex projects)
    const levelWeights = {
      'intern': 0.5,
      'junior': 0.7,
      'mid': 1.0,
      'senior': 1.3,
      'staff': 1.5,
      'principal': 1.7,
      'architect': 1.8
    };
    return levelWeights[this.level.toLowerCase()] || 1.0;
  }
}

export class RoadmapItem {
  constructor(name, description, size, complexity, requiredSkills = [], domain = '', minLevel = 'Junior', careerOpportunities = []) {
    this.name = name;
    this.description = description;
    this.size = size; // 1-5 scale (1=small, 5=large)
    this.complexity = complexity; // 1-5 scale (1=simple, 5=complex)
    this.requiredSkills = requiredSkills; // Array of required skill strings
    this.domain = domain; // Domain/area of interest
    this.minLevel = minLevel; // Minimum level required for this project
    this.careerOpportunities = careerOpportunities; // Career growth opportunities this project provides
    this.assignedMembers = []; // Array of {member, allocation} objects
    this.priority = this.calculatePriority();
  }

  calculatePriority() {
    // Higher priority for larger, more complex projects
    return (this.size * 0.6) + (this.complexity * 0.4);
  }

  getTotalAllocation() {
    return this.assignedMembers.reduce((sum, assignment) => sum + assignment.allocation, 0);
  }

  getRequiredCapacity() {
    // If we have LoE data, use it for more accurate capacity estimation
    if (this.effortBreakdown && this.effortBreakdown.total > 0) {
      // Convert weeks to capacity units
      // Assuming 1 FTE can handle 1 week of work per week
      // Scale based on complexity (complex work needs more senior/focused people)
      const complexityMultiplier = 1 + ((this.complexity - 1) * 0.1); // 1.0 to 1.4x
      const baseCapacity = this.effortBreakdown.total / 12; // Assume ~12 weeks per quarter
      return baseCapacity * complexityMultiplier;
    }
    
    // Fallback to original heuristic for items without LoE data
    return (this.size / 5) * (this.complexity / 5) * 2; // Max 2.0 capacity units
  }

  isFullyStaffed() {
    return this.getTotalAllocation() >= this.getRequiredCapacity();
  }
}

export class Allocation {
  constructor(member, item, allocation) {
    this.member = member; // TeamMember instance
    this.item = item; // RoadmapItem instance
    this.allocation = allocation; // Percentage of member's capacity (0.0 to 1.0)
    this.score = this.calculateScore();
  }

  calculateScore() {
    let score = 0;

    // Skill match bonus
    const skillMatches = this.item.requiredSkills.filter(skill => 
      this.member.hasSkill(skill)).length;
    const skillScore = skillMatches / Math.max(1, this.item.requiredSkills.length);
    score += skillScore * 35;

    // Platform specialization bonus (based on LoE breakdown)
    if (this.item.effortBreakdown) {
      const platformBonuses = this.calculatePlatformBonus();
      score += platformBonuses;
    }

    // Interest match bonus
    if (this.member.hasInterest(this.item.domain)) {
      score += 25;
    }

    // Career goal alignment bonus
    const careerMatches = this.item.careerOpportunities.filter(opp => 
      this.member.hasCareerGoal(opp)).length;
    if (careerMatches > 0) {
      score += 20;
    }

    // Level appropriateness
    const memberLevelWeight = this.member.getLevelWeight();
    const levelWeights = {
      'intern': 0.5, 'junior': 0.7, 'mid': 1.0, 'senior': 1.3, 
      'staff': 1.5, 'principal': 1.7, 'architect': 1.8
    };
    const minLevelWeight = levelWeights[this.item.minLevel.toLowerCase()] || 1.0;
    
    if (memberLevelWeight >= minLevelWeight) {
      // Bonus for appropriate level match
      score += 10;
      // Additional bonus for complex projects with senior people
      if (this.item.complexity >= 4 && memberLevelWeight >= 1.3) {
        score += 10;
      }
    } else {
      // Penalty for under-leveled assignment
      score -= 20;
    }

    // Project priority bonus
    score += this.item.priority * 5;

    // Efficiency bonus (higher allocation is more efficient)
    score += this.allocation * 15;

    return score;
  }

  calculatePlatformBonus() {
    let bonus = 0;
    const effort = this.item.effortBreakdown;
    if (!effort) return bonus;

    // Define platform skill mappings
    const platformSkills = {
      ios: ['ios', 'swift', 'objective-c', 'mobile development', 'mobile', 'app development'],
      android: ['android', 'kotlin', 'java', 'mobile development', 'mobile', 'app development'], 
      web: ['frontend', 'javascript', 'react', 'vue', 'angular', 'html', 'css', 'web development'],
      backend: ['backend', 'api', 'node.js', 'python', 'java', 'database', 'sql', 'server']
    };

    // Calculate bonus based on member's skills matching platform requirements
    ['ios', 'android', 'web', 'backend'].forEach(platform => {
      const platformEffort = effort[platform];
      if (platformEffort > 0) {
        const relevantSkills = platformSkills[platform];
        const memberSkillsLower = this.member.skills.map(s => s.toLowerCase());
        const hasRelevantSkill = relevantSkills.some(skill => 
          memberSkillsLower.some(memberSkill => memberSkill.includes(skill))
        );
        
        if (hasRelevantSkill) {
          // Bonus scaled by the effort needed for this platform
          const platformWeight = platformEffort / effort.total;
          bonus += platformWeight * 30; // Up to 30 points for perfect match
        }
      }
    });

    // Additional bonus for full-stack developers on multi-platform projects
    if (effort.total > 0) {
      const platformCount = [effort.ios, effort.android, effort.web, effort.backend].filter(e => e > 0).length;
      if (platformCount > 2) {
        const memberSkillsLower = this.member.skills.map(s => s.toLowerCase());
        const isFullStack = ['frontend', 'backend', 'full-stack', 'fullstack'].some(skill => 
          memberSkillsLower.some(memberSkill => memberSkill.includes(skill))
        );
        if (isFullStack) {
          bonus += 15; // Bonus for full-stack on complex cross-platform projects
        }
      }
    }

    return bonus;
  }
}