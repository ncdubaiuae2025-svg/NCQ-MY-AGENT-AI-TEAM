from base_agent import BaseAgent
import json
class ScoutAgent(BaseAgent):
    def __init__(self): super().__init__(name="Scout")
    def run(self, context: dict) -> dict:
        requirements = [{"source": "github", "title": "مثال", "priority": "high"}]
        try:
            response = self.call_ai(f"حلل هذه المتطلبات: {json.dumps(requirements)}")
            return {"status": "success", "analysis": response}
        except Exception as e: return {"status": "error", "error": str(e)}
