import json
def execute(context: dict, agent) -> dict:
    person_data = context.get("person_data")
    if not person_data: return {"error": "لا توجد بيانات"}
    try:
        result = agent.call_ncq_api("/persons", "POST", person_data)
        return {"status": "success", "person": result}
    except Exception as e: return {"status": "error", "error": str(e)}
