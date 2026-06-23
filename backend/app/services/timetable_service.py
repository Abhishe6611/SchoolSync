import random
from typing import List, Dict, Any

def generate_timetable(
    class_ids: List[int],
    allocations: List[Dict[str, Any]],
    settings: Dict[str, Any]
) -> Dict[int, List[List[Dict[str, str]]]]:
    """
    Generates a timetable for a batch of classes, ensuring teachers don't overlap.
    Returns: { class_id: 2D grid [day][period] }
    """
    days = settings.get("days_per_week", 6)
    periods = settings.get("periods_per_day", 8)
    lunch_period = settings.get("lunch_after_period", 4)
    short_break_period = settings.get("short_break_after_period", 2)
    
    # Initialize grids for each class
    # Grid structure: grid[class_id][day][period]
    grids = {cid: [[None for _ in range(periods)] for _ in range(days)] for cid in class_ids}
    
    # Track teacher availability
    # teacher_schedule[teacher_id] = set of (day, period)
    teacher_schedule = {}
    
    # Prepare remaining periods for each allocation
    remaining = []
    for alloc in allocations:
        for _ in range(alloc["periods_per_week"]):
            remaining.append({
                "class_id": alloc["class_id"],
                "subject": alloc["subject"],
                "teacher_id": alloc["teacher_id"],
                "teacher_name": alloc["teacher_name"]
            })
            
    # Randomize to avoid deterministic blocking
    random.shuffle(remaining)
    
    # Mark breaks in the grids
    for cid in class_ids:
        for day in range(days):
            # We assume breaks take up an entire period slot for simplicity in the 2D grid representation,
            # or we handle them entirely in the UI. 
            # Given the reference image, breaks aren't part of the numbered periods (1 to 6).
            # The UI adds them between columns. So the grid is JUST academic periods.
            pass

    # Fast Random-Restart Greedy Algorithm
    def attempt_generation():
        # Fresh grids and schedules for this attempt
        local_grids = {cid: [[None for _ in range(periods)] for _ in range(days)] for cid in class_ids}
        local_teacher_schedule = {}
        # Track how many times a teacher teaches a specific class on a given day: (cid, tid, day) -> count
        local_teacher_class_day_counts = {}
        
        for alloc in remaining:
            cid = alloc["class_id"]
            tid = alloc["teacher_id"]
            if tid not in local_teacher_schedule:
                local_teacher_schedule[tid] = set()
                
            # Find all valid slots for this specific period
            valid_slots = []
            for d in range(days):
                # NEW CONSTRAINT: Do not allow a teacher (subject) to teach the same class more than twice a day
                if local_teacher_class_day_counts.get((cid, tid, d), 0) >= 2:
                    continue
                    
                for p in range(periods):
                    if local_grids[cid][d][p] is None and (d, p) not in local_teacher_schedule[tid]:
                        valid_slots.append((d, p))
            
            # If no slot is valid, this attempt hit a dead-end
            if not valid_slots:
                return False, None
                
            # Pick a random valid slot to avoid clustering
            d, p = random.choice(valid_slots)
            
            local_grids[cid][d][p] = {
                "subject": alloc["subject"],
                "teacher": alloc["teacher_name"],
                "type": "Class"
            }
            local_teacher_schedule[tid].add((d, p))
            local_teacher_class_day_counts[(cid, tid, d)] = local_teacher_class_day_counts.get((cid, tid, d), 0) + 1
            
        return True, local_grids

    # Try up to 200 random restarts (usually finds a solution within 10 if constraints aren't too tight)
    for attempt in range(200):
        random.shuffle(remaining)
        success, final_grids = attempt_generation()
        if success:
            return final_grids
            
    raise ValueError("Could not generate a conflict-free timetable within the time limit. Please check if a teacher is assigned too many periods or try adding fewer subjects.")
