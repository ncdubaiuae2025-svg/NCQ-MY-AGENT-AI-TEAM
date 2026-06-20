from base_agent import BaseAgent
class ArbitratorAgent(BaseAgent):
    def __init__(self): super().__init__(name="Arbitrator")
    def run(self, context: dict) -> dict:
        # منطق arbitrator هنا
        return {"status": "success", "message": "وكيل Arbitrator يعمل"}
