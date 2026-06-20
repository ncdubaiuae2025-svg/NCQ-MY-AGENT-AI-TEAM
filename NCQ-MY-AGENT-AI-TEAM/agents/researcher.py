from base_agent import BaseAgent
class ResearcherAgent(BaseAgent):
    def __init__(self): super().__init__(name="Researcher")
    def run(self, context: dict) -> dict:
        # منطق researcher هنا
        return {"status": "success", "message": "وكيل Researcher يعمل"}
