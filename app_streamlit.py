import streamlit as st
import threading
import http.server
import socketserver
import os
import time

# 配置
PORT = 8080      # 静态文件服务端口
DIRECTORY = "./dist" # React 构建产物目录

# 简易静态文件服务器
def start_server():
    # 切换到 dist 目录 (如果存在)
    # 但我们已经在 SimpleHTTPRequestHandler 中指定 directory 参数 (Python 3.7+)
    
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=DIRECTORY, **kwargs)
        
        # 禁用日志，避免 Streamlit 后台输出太多
        def log_message(self, format, *args):
            pass

    # 允许端口重用
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"Static file server running at port {PORT}")
            httpd.serve_forever()
    except OSError as e:
        print(f"Port {PORT} might be in use or server already running: {e}")

# 在 Streamlit 中启动后台服务
# 使用 session_state 防止每次交互都重启服务
if 'server_started' not in st.session_state:
    if os.path.exists(DIRECTORY):
        t = threading.Thread(target=start_server, daemon=True)
        t.start()
        st.session_state['server_started'] = True
        time.sleep(1) # 给服务一点启动时间
    else:
        st.error(f"构建目录 '{DIRECTORY}' 不存在！请先执行 'npm run build'。")

# Streamlit 页面配置
st.set_page_config(
    page_title="AI Virtual Assistant",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# 隐藏 Streamlit 默认的 padding 和 footer
st.markdown("""
    <style>
        .block-container {
            padding-top: 0rem;
            padding-bottom: 0rem;
            padding-left: 0rem;
            padding-right: 0rem;
        }
        footer {visibility: hidden;}
    </style>
""", unsafe_allow_html=True)

# 渲染 iframe
if 'server_started' in st.session_state:
    app_url = f"http://localhost:{PORT}"
    st.components.v1.iframe(app_url, height=900, scrolling=False)
else:
    st.warning("正在等待服务启动...")
