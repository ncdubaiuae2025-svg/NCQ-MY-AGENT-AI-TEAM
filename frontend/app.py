import streamlit as st
import sys
import os
import json
from datetime import datetime

# إضافة مجلد المشروع الرئيسي إلى sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# الآن يمكننا استيراد agent_core
try:
    from agent_core import AgentEngine
except ModuleNotFoundError as e:
    st.error(f"خطأ في الاستيراد: {e}. تأكد من وجود ملف agent_core.py في المجلد الرئيسي.")
    st.stop()

st.set_page_config(page_title="NCQ Agent Engine - لوحة التحكم", layout="wide")
st.title("🧠 NCQ - محرك الوكلاء الذكي")
st.caption(f"آخر تحديث: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

@st.cache_resource
def load_engine():
    return AgentEngine()

engine = load_engine()

with st.sidebar:
    st.header("📋 قائمة الوكلاء")
    agents_list = list(engine.agents.keys())
    for agent in agents_list:
        st.write(f"✅ {agent}")
    
    st.divider()
    st.header("🛠️ المهارات المحملة")
    skills_list = list(engine.skills.keys())
    for skill in skills_list:
        st.write(f"🔧 {skill}")

st.header("🚀 تنفيذ مهمة فورية")
task_type = st.radio("اختر نوع المهمة:", ["تشغيل وكيل فردي", "تنفيذ سلسلة (Chain)"])

if task_type == "تشغيل وكيل فردي":
    selected_agent = st.selectbox("اختر الوكيل:", agents_list)
    context_input = st.text_area("سياق المهمة (JSON):", value='{"task": "حلل هذه المتطلبات"}')
    
    if st.button("▶️ تشغيل الآن"):
        with st.spinner(f"جاري تشغيل الوكيل {selected_agent}..."):
            try:
                context = json.loads(context_input)
                result = engine.run_agent(selected_agent, context)
                st.success("✅ تم التنفيذ بنجاح!")
                st.json(result)
            except Exception as e:
                st.error(f"❌ فشل التنفيذ: {e}")

else:
    selected_chain = st.selectbox("اختر السلسلة:", list(engine.config.get('chains', {}).keys()))
    context_input = st.text_area("سياق السلسلة (JSON):", value='{"person_data": {"name": "أحمد"}}')
    
    if st.button("▶️ تشغيل السلسلة"):
        with st.spinner(f"جاري تنفيذ السلسلة {selected_chain}..."):
            try:
                context = json.loads(context_input)
                result = engine.execute_chain(selected_chain, context)
                st.success("✅ تم تنفيذ السلسلة بنجاح!")
                st.json(result)
            except Exception as e:
                st.error(f"❌ فشل التنفيذ: {e}")

st.divider()
st.subheader("📜 سجل العمليات الأخير (Mesh)")
if engine.mesh_history:
    for record in engine.mesh_history[-5:]:
        with st.expander(f"⚡ {record['agent']} - {datetime.fromtimestamp(record['timestamp']).strftime('%H:%M:%S')}"):
            st.json(record['result'])
else:
    st.info("لا توجد عمليات مسجلة بعد.")
