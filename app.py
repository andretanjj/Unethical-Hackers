import streamlit as st
import pandas as pd
from juiceshop_wrapper import JuiceShopAPI

# Initialize API
api = JuiceShopAPI()

st.set_page_config(
    page_title="Juice Shop Companion",
    page_icon="🥤",
    layout="wide"
)

# Custom CSS for better aesthetics
st.markdown("""
<style>
    .reportview-container {
        background: #f0f2f6;
    }
    .main {
        background: #ffffff;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    h1 {
        color: #ff6600;
    }
    .stButton>button {
        color: white;
        background-color: #ff6600;
        border-radius: 5px;
    }
    .stButton>button:hover {
        background-color: #cc5200;
    }
</style>
""", unsafe_allow_html=True)

st.title("🥤 OWASP Juice Shop Companion")
st.markdown("Your friendly guide to learning web security!")

# Sidebar
st.sidebar.header("Configuration")
if api.check_connection():
    st.sidebar.success("Connected to Juice Shop ✅")
else:
    st.sidebar.error("Could not connect to Juice Shop ❌")
    st.sidebar.info("Is it running on http://localhost:3000?")

# Fetch Data
status_map = api.get_challenge_status()
all_challenges = list(status_map.values())

# Filters
st.sidebar.subheader("Filters")
search_term = st.sidebar.text_input("Search Challenge")
selected_difficulty = st.sidebar.multiselect(
    "Difficulty",
    options=sorted(list(set([c['difficulty'] for c in all_challenges]))),
    default=[]
)
show_solved = st.sidebar.checkbox("Show Solved Challenges", value=True)

# Main App Logic
if not all_challenges:
    st.warning("No challenges found. Please check your Juice Shop connection.")
else:
    # Filtering Logic
    filtered_challenges = all_challenges
    
    if search_term:
        filtered_challenges = [c for c in filtered_challenges if search_term.lower() in c['name'].lower()]
    
    if selected_difficulty:
        filtered_challenges = [c for c in filtered_challenges if c['difficulty'] in selected_difficulty]
        
    if not show_solved:
        filtered_challenges = [c for c in filtered_challenges if not c['solved']]

    st.subheader(f"Challenges ({len(filtered_challenges)})")
    
    # Display Challenges
    for challenge in filtered_challenges:
        with st.expander(f"{'✅' if challenge['solved'] else '🔒'} {challenge['name']} (Difficulty: {challenge['difficulty']})"):
            st.markdown(f"**Description:** {challenge['description']}")
            st.markdown(f"**Category:** {challenge['category']}")
            
            if challenge['solved']:
                st.success("You have solved this challenge! 🎉")
            else:
                st.info("Status: Unsolved")
                
            # Companion / Hints Section
            st.markdown("---")
            st.subheader("🤖 Companion Guide")
            
            # Educational Content (Category-based)
            educational_tips = {
                "Injection": "💉 **Injection Attacks**: strict input validation is key. Try entering unexpected characters like `'`, `OR 1=1`, or `<script>` tags in input fields.",
                "XSS (Cross Site Scripting)": "🌐 **XSS**: Can you make the browser execute your JavaScript? Try payloads like `<script>alert(1)</script>` in comments or search bars.",
                "Broken Access Control": "🚪 **Broken Access Control**: Are you able to access pages you shouldn't? Try manipulating URLs or ID parameters.",
                "Sensitive Data Exposure": "🕵️ **Sensitive Data**: Look for information that shouldn't be public. Check network requests, source code, or backup files.",
                "Security Misconfiguration": "⚙️ **Misconfiguration**: Default credentials? Debug features left on? Publicly accessible config files?",
                "Cryptographic Issues": "🔐 **Crypto**: Look for weak encryption algorithms (MD5, base64) or secrets hardcoded in the frontend.",
            }
            
            # Show specific tip if available, otherwise generic
            category_tip = educational_tips.get(challenge['category'])
            if category_tip:
                 st.info(category_tip)
            else:
                 st.info(f"🔍 **Tip**: Focus on the concepts related to **{challenge['category']}**. Research common vulnerabilities in this area.")

            # Simulated Progressive Hints (In a real app, this could be more complex)
            if st.button("Need a specific nudge?", key=f"nudge_{challenge['id']}"):
                if challenge['hint']:
                    st.markdown(f"**Juice Shop Hint:** {challenge['hint']}")
                else:
                    st.markdown("No specific hint available from Juice Shop.")
                
            if challenge['hintUrl']:
                 st.markdown(f"[Official Documentation]({challenge['hintUrl']})")
                 
            # Custom educational content could go here
            st.markdown("> *Try understanding the underlying mechanism before jumping to the solution.*")

