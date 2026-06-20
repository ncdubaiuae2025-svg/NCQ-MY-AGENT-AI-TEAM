import os
import json
import requests
from typing import Dict, Any

class BaseAgent:
    def __init__(self, name: str = "BaseAgent"):
        self.name = name
        # المفتاح سيُقرأ من ملف .env
        self.ai_api_key = os.getenv("OPENROUTER_API_KEY", "")
        # النموذج الافتراضي الآن هو deepseek-chat
        self.ai_model = os.getenv("AI_MODEL", "deepseek-chat")
        self.ncq_api_url = os.getenv("NCQ_API_URL", "")
        self.ncq_api_token = os.getenv("NCQ_API_TOKEN", "")
        self.config = {}

    def call_ai(self, prompt: str) -> str:
        if not self.ai_api_key:
            raise ValueError("OPENROUTER_API_KEY غير مضبوط (ضع مفتاح DeepSeek)")
        
        # هنا التغيير الجوهري: الاتصال المباشر بـ DeepSeek API
        response = requests.post(
            url="https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {self.ai_api_key}",
                "Content-Type": "application/json"
            },
            data=json.dumps({
                "model": self.ai_model,
                "messages": [
                    {"role": "system", "content": f"أنت وكيل {self.name} في منصة NCQ. أجب باللغة العربية."},
                    {"role": "user", "content": prompt}
                ]
            })
        )
        
        if response.status_code != 200:
            raise Exception(f"AI خطأ من DeepSeek: {response.text}")
        
        return response.json()['choices'][0]['message']['content']

    def call_ncq_api(self, endpoint: str, method: str = "GET", data: Dict = None) -> Dict:
        if not self.ncq_api_url or not self.ncq_api_token:
            raise ValueError("NCQ API غير مضبوط")
        url = f"{self.ncq_api_url}{endpoint}"
        headers = {"Authorization": f"Bearer {self.ncq_api_token}", "Content-Type": "application/json"}
        r = requests.request(method, url, headers=headers, json=data)
        if r.status_code not in [200, 201, 204]:
            raise Exception(f"NCQ API خطأ: {r.text}")
        return r.json() if r.text else {}

    def run(self, context: Dict) -> Dict:
        return {"status": "not_implemented"}