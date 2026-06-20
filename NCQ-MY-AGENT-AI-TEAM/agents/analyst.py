from base_agent import BaseAgent
class AnalystAgent(BaseAgent):
    def __init__(self): super().__init__(name="Analyst")
    def run(self, context: dict) -> dict:
        # منطق analyst هنا
        return {"status": "success", "message": "وكيل Analyst يعمل"}
