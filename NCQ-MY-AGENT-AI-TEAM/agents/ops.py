from base_agent import BaseAgent
class OpsAgent(BaseAgent):
    def __init__(self): super().__init__(name="Ops")
    def run(self, context: dict) -> dict:
        # منطق ops هنا
        return {"status": "success", "message": "وكيل Ops يعمل"}
