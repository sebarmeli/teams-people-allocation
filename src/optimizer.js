import { Allocation } from './models.js';

export class AllocationOptimizer {
  constructor(teamMembers, roadmapItems) {
    this.teamMembers = teamMembers;
    this.roadmapItems = roadmapItems;
    this.allocations = [];
  }

  optimize() {
    // Reset all allocations
    this.teamMembers.forEach(member => {
      member.allocatedCapacity = 0.0;
      member.assignments = [];
    });
    
    this.roadmapItems.forEach(item => {
      item.assignedMembers = [];
    });
    
    this.allocations = [];

    // Sort roadmap items by priority (size + complexity)
    const sortedItems = [...this.roadmapItems].sort((a, b) => b.priority - a.priority);

    // Allocate each item using a greedy approach with optimization
    for (const item of sortedItems) {
      this.allocateItem(item);
    }

    return this.generateReport();
  }

  allocateItem(item) {
    const requiredCapacity = item.getRequiredCapacity();
    let remainingCapacity = requiredCapacity;

    // Find potential allocations for this item
    const potentialAllocations = this.findPotentialAllocations(item);
    
    // Sort by score (best matches first)
    potentialAllocations.sort((a, b) => b.score - a.score);

    // Allocate capacity starting with best matches
    for (const potential of potentialAllocations) {
      if (remainingCapacity <= 0) break;

      const member = potential.member;
      const availableCapacity = member.getAvailableCapacity();
      
      if (availableCapacity <= 0) continue;

      // Determine how much capacity to allocate
      const allocationAmount = Math.min(
        remainingCapacity,
        availableCapacity,
        0.5 // Max 50% of a person's capacity to any single project
      );

      if (allocationAmount > 0.1) { // Only allocate if meaningful (>10%)
        const allocation = new Allocation(member, item, allocationAmount);
        
        // Update member's allocated capacity
        member.allocatedCapacity += allocationAmount;
        if (!member.assignments) member.assignments = [];
        member.assignments.push({
          item: item.name,
          allocation: allocationAmount,
          percentage: Math.round(allocationAmount * 100)
        });

        // Update item's assigned members
        item.assignedMembers.push({
          member: member.name,
          allocation: allocationAmount,
          percentage: Math.round(allocationAmount * 100)
        });

        this.allocations.push(allocation);
        remainingCapacity -= allocationAmount;
      }
    }

    // Mark item status based on allocation
    item.allocationStatus = this.getItemStatus(item, requiredCapacity - remainingCapacity);
  }

  findPotentialAllocations(item) {
    const potentials = [];

    for (const member of this.teamMembers) {
      if (member.getAvailableCapacity() > 0.1) { // Only consider if >10% capacity available
        // Create a mock allocation to calculate score
        const mockAllocation = new Allocation(member, item, 0.3); // Use 30% as baseline for scoring
        potentials.push({
          member: member,
          score: mockAllocation.calculateScore()
        });
      }
    }

    return potentials;
  }

  getItemStatus(item, allocatedCapacity) {
    const requiredCapacity = item.getRequiredCapacity();
    const ratio = allocatedCapacity / requiredCapacity;

    if (ratio >= 0.9) return 'fully-staffed';
    if (ratio >= 0.6) return 'adequately-staffed';
    if (ratio >= 0.3) return 'under-staffed';
    return 'not-staffed';
  }

  generateReport() {
    // Calculate overall statistics
    const totalTeamCapacity = this.teamMembers.reduce((sum, member) => sum + member.capacity, 0);
    const totalAllocatedCapacity = this.teamMembers.reduce((sum, member) => sum + member.allocatedCapacity, 0);
    const utilizationRate = (totalAllocatedCapacity / totalTeamCapacity) * 100;

    // Categorize items by status
    const itemsByStatus = {
      'fully-staffed': this.roadmapItems.filter(item => item.allocationStatus === 'fully-staffed'),
      'adequately-staffed': this.roadmapItems.filter(item => item.allocationStatus === 'adequately-staffed'),
      'under-staffed': this.roadmapItems.filter(item => item.allocationStatus === 'under-staffed'),
      'not-staffed': this.roadmapItems.filter(item => item.allocationStatus === 'not-staffed')
    };

    // Identify over/under-utilized team members
    const underUtilized = this.teamMembers.filter(member => 
      (member.allocatedCapacity / member.capacity) < 0.7);
    const overUtilized = this.teamMembers.filter(member => 
      (member.allocatedCapacity / member.capacity) > 0.95);

    // Add calculated values to items for display
    const enhancedItemsByStatus = {};
    for (const [status, items] of Object.entries(itemsByStatus)) {
      enhancedItemsByStatus[status] = items.map(item => ({
        ...item,
        requiredCapacity: item.getRequiredCapacity(),
        totalAllocation: item.getTotalAllocation()
      }));
    }

    return {
      summary: {
        totalTeamCapacity: Math.round(totalTeamCapacity * 100) / 100,
        totalAllocatedCapacity: Math.round(totalAllocatedCapacity * 100) / 100,
        utilizationRate: Math.round(utilizationRate),
        itemsCount: this.roadmapItems.length,
        fullyStaffedCount: itemsByStatus['fully-staffed'].length,
        totalAssignments: this.allocations.length
      },
      allocations: this.allocations.map(allocation => ({
        member: allocation.member.name,
        item: allocation.item.name,
        allocation: allocation.allocation,
        score: allocation.score
      })),
      teamMembers: this.teamMembers,
      roadmapItems: this.roadmapItems,
      itemsByStatus: enhancedItemsByStatus,
      underUtilized: underUtilized,
      overUtilized: overUtilized,
      recommendations: this.generateRecommendations(itemsByStatus, underUtilized, overUtilized)
    };
  }

  generateRecommendations(itemsByStatus, underUtilized, overUtilized) {
    const recommendations = [];

    if (itemsByStatus['not-staffed'].length > 0) {
      recommendations.push(`❌ ${itemsByStatus['not-staffed'].length} item(s) have no staffing. Consider hiring or deprioritizing.`);
      
      // Analyze missing FTE types
      const missingFTETypes = this.analyzeMissingFTETypes(itemsByStatus['not-staffed']);
      if (Object.keys(missingFTETypes).length > 0) {
        const missingTypesText = Object.entries(missingFTETypes)
          .map(([type, count]) => `${type}: ${count.toFixed(1)} FTE`)
          .join(', ');
        recommendations.push(`🚨 Missing FTE types needed: ${missingTypesText}`);
      }
    }

    if (itemsByStatus['under-staffed'].length > 0) {
      recommendations.push(`⚠️ ${itemsByStatus['under-staffed'].length} item(s) are under-staffed. May need timeline adjustments.`);
    }

    if (underUtilized.length > 0) {
      recommendations.push(`💡 ${underUtilized.length} team member(s) have available capacity for additional work.`);
    }

    if (overUtilized.length > 0) {
      recommendations.push(`⚡ ${overUtilized.length} team member(s) may be over-allocated. Consider load balancing.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Allocation looks well balanced! Good distribution across team and projects.');
    }

    return recommendations;
  }

  analyzeMissingFTETypes(unstaffedItems) {
    const missingTypes = {};
    
    // Define platform skill mappings
    const platformSkills = {
      'iOS Developer': ['ios', 'swift', 'objective-c', 'mobile development', 'mobile', 'app development'],
      'Android Developer': ['android', 'kotlin', 'java', 'mobile development', 'mobile', 'app development'], 
      'Web Developer': ['frontend', 'javascript', 'react', 'vue', 'angular', 'html', 'css', 'web development'],
      'Backend Developer': ['backend', 'api', 'node.js', 'python', 'java', 'database', 'sql', 'server']
    };

    for (const item of unstaffedItems) {
      if (item.effortBreakdown) {
        // Check each platform requirement
        if (item.effortBreakdown.ios > 0) {
          const neededFTE = item.effortBreakdown.ios / 13; // Convert weeks to FTE (13 weeks per quarter)
          const availableCapacity = this.getAvailableCapacityForSkills(platformSkills['iOS Developer']);
          const shortage = Math.max(0, neededFTE - availableCapacity);
          if (shortage > 0) {
            missingTypes['iOS Developer'] = (missingTypes['iOS Developer'] || 0) + shortage;
          }
        }
        
        if (item.effortBreakdown.android > 0) {
          const neededFTE = item.effortBreakdown.android / 13; // Convert weeks to FTE (13 weeks per quarter)
          const availableCapacity = this.getAvailableCapacityForSkills(platformSkills['Android Developer']);
          const shortage = Math.max(0, neededFTE - availableCapacity);
          if (shortage > 0) {
            missingTypes['Android Developer'] = (missingTypes['Android Developer'] || 0) + shortage;
          }
        }
        
        if (item.effortBreakdown.web > 0) {
          const neededFTE = item.effortBreakdown.web / 13; // Convert weeks to FTE (13 weeks per quarter)
          const availableCapacity = this.getAvailableCapacityForSkills(platformSkills['Web Developer']);
          const shortage = Math.max(0, neededFTE - availableCapacity);
          if (shortage > 0) {
            missingTypes['Web Developer'] = (missingTypes['Web Developer'] || 0) + shortage;
          }
        }
        
        if (item.effortBreakdown.backend > 0) {
          const neededFTE = item.effortBreakdown.backend / 13; // Convert weeks to FTE (13 weeks per quarter)
          const availableCapacity = this.getAvailableCapacityForSkills(platformSkills['Backend Developer']);
          const shortage = Math.max(0, neededFTE - availableCapacity);
          if (shortage > 0) {
            missingTypes['Backend Developer'] = (missingTypes['Backend Developer'] || 0) + shortage;
          }
        }
      }
    }

    return missingTypes;
  }

  getAvailableCapacityForSkills(skills) {
    let totalCapacity = 0;
    
    for (const member of this.teamMembers) {
      const hasRelevantSkill = skills.some(skill => 
        member.skills.some(memberSkill => 
          memberSkill.toLowerCase().includes(skill.toLowerCase()) || 
          skill.toLowerCase().includes(memberSkill.toLowerCase())
        )
      );
      
      if (hasRelevantSkill) {
        totalCapacity += member.getAvailableCapacity();
      }
    }
    
    return totalCapacity;
  }
}