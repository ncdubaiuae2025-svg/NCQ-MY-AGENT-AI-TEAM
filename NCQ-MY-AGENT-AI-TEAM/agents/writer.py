from base_agent import BaseAgent
class WriterAgent(BaseAgent):
    def __init__(self): super().__init__(name="Writer")
    def run(self, context: dict) -> dict:
        # منطق writer هنا
        return {"status": "success", "message": "وكيل Writer يعمل"}
