<template>
  <div class="inner-html-container">
    <div class="page">
      <div class="tips">
        <div class="title">DeepSeek-GPT</div>
        <div class="desc" v-if="!isMobile">
          该应用采取本地缓存的方式，不保留任何用户有关数据，请文明使用！
        </div>
        <div @click="handleClearStorage" v-else class="pointer">清空</div>
      </div>
      <div class="grid-space-between" :class="!isMobile ? 'grid-box' : ''">
        <div class="left-container" v-if="!isMobile">
          <el-button
              type="success"
              style="width: 100%"
              @click="handleAddSession"
          >新建对话</el-button
          >
          <div class="session-area">
            <div
                class="session-item"
                :class="activeIndex == index ? 'session-item-active' : ''"
                v-for="(item, index) in sessionList"
                :key="index"
                @click="handleChangeSessionIndex(index)"
            >
              <span
                  :class="activeIndex == index ? 'active-node' : 'normal-node'"
                  v-if="editIndex != index"
              >{{ item.title }}</span
              >
              <el-input
                  :ref="`renameRef_${index}`"
                  autofocus
                  v-model="item.title"
                  v-else
                  size="small"
                  style="width: 120px"
                  @blur="editIndex = -1"
                  @change="editIndex = -1"
              />
              <div class="icon-box">
                <!-- 重命名 -->
                <el-icon
                    class="icon"
                    color="#E6A23C"
                    @click.stop="handleFocusInput(index)"
                >
                  <BrushFilled />
                </el-icon>
                <!-- 删除 -->
                <el-icon
                    class="icon"
                    color="#F56C6C"
                    @click.stop="handleDeleteSession(index)"
                ><DeleteFilled
                /></el-icon>
              </div>
            </div>
          </div>
        </div>
        <div class="container">
          <div class="message-area">
            <MessageComp
                ref="messageRef"
                :message="queryInfos.messages"
            ></MessageComp>
          </div>
          <div class="user-tokens" :class="isMobile ? 'left-space' : ''">
            当前余额为：￥{{ totalAmt || 0 }}
          </div>
          <div class="input-area" :class="isMobile ? 'left-space' : ''">
            <el-input
                v-model="queryKeys"
                id="keyInput"
                placeholder="请输入内容"
            />
            <el-button
                style="height: 40px"
                type="primary"
                @click="handleRequest"
                :disabled="!queryKeys"
                :loading="loading"
            >
              <el-icon><Promotion /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import OpenAI from "openai";
import MessageComp from "./components/messageComp.vue";
import { Promotion, DeleteFilled, BrushFilled } from "@element-plus/icons-vue";
import { getTokens } from "@/api/modules/deepseek.js";
import { ElMessage, ElMessageBox } from "element-plus";
import MobileDetect from "mobile-detect";
export default {
  components: { MessageComp, Promotion, DeleteFilled, BrushFilled },
  data() {
    return {
      isMobile: false, // 当前设备是不是手机
      renameValue: "",
      sessionList: [],
      activeIndex: -1,
      editIndex: -1, // 当前重命名的序号

      totalAmt: 0, // 余额
      queryKeys: "",
      openai: null,
      loading: false,
      queryInfos: {
        // { role: "assistant", content: "You are a helpful assistant." }
        // {"role": "user", "content": "What's the highest mountain in the world?"}
        messages: [],
        model: "deepseek-chat",
        stream: true,
      },
      isKeyIn: false,
      apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
    };
  },
  computed: {},
  created() {
    // 所有VUE_APP_开头的变量会自动加载
    this.initSessionList();
    this.initIndex();
    this.initOpenAI();
    this.initToken();
    // 监测当前设备是不是手机
    const md = new MobileDetect(window.navigator.userAgent);
    this.isMobile = md.mobile();
    const _this = this;
    this.$nextTick(() => {
      document
          .getElementById("keyInput")
          .addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
              _this.handleRequest();
              event.preventDefault();
            }
          });
    });
  },
  mounted() {
    this.forceScrollToBottom();
  },
  watch: {
    sessionList: {
      handler(val) {
        const list = val.map((o, i) => {
          if (i == this.activeIndex) {
            return {
              ...o,
              messages: this.queryInfos.messages,
            };
          } else {
            return { ...o };
          }
        });
        localStorage.setItem("list", JSON.stringify(list));
      },
      deep: true,
      immediate: false,
    },
    activeIndex: {
      handler(val) {
        localStorage.setItem("index", JSON.stringify(val));
      },
      deep: true,
      immediate: false,
    },
  },
  methods: {
    // 手机端清空对话
    handleClearStorage() {
      localStorage.removeItem("list");
      localStorage.removeItem("index");
      this.queryInfos.messages = [];
      this.sessionList = [];
      this.activeIndex = -1;
    },
    // 初始化对话列表
    initSessionList() {
      this.sessionList = JSON.parse(localStorage.getItem("list") || "[]");
    },
    // 初始化当前序号
    initIndex() {
      const listLen = JSON.parse(localStorage.getItem("list") || "[]").length; // 对话列表
      const lastIndex = JSON.parse(localStorage.getItem("index") || "-1"); // 当前对话的序号
      if (listLen) {
        this.activeIndex = lastIndex || 0;
      } else {
        this.activeIndex = -1;
      }
      if (this.activeIndex != -1) {
        this.queryInfos.messages =
            this.sessionList[this.activeIndex].messages || []; // 获取当前对话历史记录
      }
    },
    // 新增session对话
    handleAddSession() {
      if (this.loading) {
        ElMessage({ type: "warning", message: "请当前问题查询完成后重试！" });
        return;
      }
      this.sessionList.push({
        title: `对话${this.sessionList.length + 1}`,
        crtTime: new Date(),
        messages: [],
      });
      this.queryInfos.messages = [];
      this.activeIndex = this.sessionList.length - 1;
    },
    // 删除对话
    handleDeleteSession(index = 0) {
      ElMessageBox.confirm("确认删除当前对话？", "警告", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(() => {
        // 删除指定的对话
        this.sessionList.splice(index, 1);
        /**
         * 逻辑1:删除的当前选中的对话框，判断新的当前元素（原来的+1）是否存在，不存在则向前抓
         * 逻辑2:删除的非当前选中的(只判断小于，因为大于不影响当前展示内容)
         */
        if (index == this.activeIndex) {
          // 初始化index
          this.activeIndex = this.sessionList[index] ? index : --index;
        } else if (index < this.activeIndex) {
          this.activeIndex = --this.activeIndex;
        }
        // 更新页面数据展示
        this.queryInfos.messages =
            this.activeIndex > -1 ? this.sessionList[this.activeIndex] : [];
        this.handleChangeSessionIndex(this.activeIndex);
      }).catch((action) => {
      });
    },
    handleFocusInput(index) {
      const _this = this;
      this.editIndex = index;
      this.$nextTick(() => {
        _this.$refs[`renameRef_${index}`][0].focus();
      });
    },
    // 切换session对话序号
    handleChangeSessionIndex(index) {
      if (this.loading) {
        ElMessage({ type: "warning", message: "请当前问题查询完成后重试！" });
        return;
      }
      this.activeIndex = index;
      this.queryInfos.messages =
          this.sessionList[this.activeIndex]?.messages || [];
      this.forceScrollToBottom();
    },
    initOpenAI() {
      this.openai = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
    },
    forceScrollToBottom() {
      this.$refs.messageRef.scrollBottom(true)
    },
    async initToken() {
      const res = await getTokens({
        deepseek: "Y",
        gptToken: this.apiKey,
      });
      const { balance_infos = [] } = res;
      balance_infos.forEach((o) => {
        this.totalAmt += Number(o.total_balance);
      });
    },
    // 点击进行提问
    async handleRequest() {
      if (!this.queryKeys) return;
      if (!this.openai) this.initOpenAI();
      // 查询当前是否存在对话窗口，不存在的话，新建一个对话窗口
      if (!this.sessionList.length) {
        await this.handleAddSession();
      }
      // 1.向对话窗口添加对话信息(请求)
      this.queryInfos.messages.push({
        role: "user",
        content: this.queryKeys,
      });
      this.queryKeys = null;
      // 滚动到底部
      this.forceScrollToBottom();

      try {
        // 2.请求服务进行提问
        this.loading = true;
        // 开始新回答时重置自动滚动
        this.$refs.messageRef.isAutoScroll = true;
        const response = await this.openai.chat.completions.create(
            this.queryInfos
        );
        this.queryInfos.messages.push({ role: "assistant", content: "" });
        for await (const part of response) {
          this.queryInfos.messages[
          this.queryInfos.messages.length - 1
              ].content += part.choices[0].delta.content;
          // 每次更新后立即滚动
          this.$refs.messageRef.scrollBottom();
        }
        this.$refs.messageRef.scrollBottom();
        // 更新缓存数据
        this.sessionList[this.activeIndex].messages = this.queryInfos.messages;
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.queryInfos.messages.push({
          role: "assistant",
          content: "加载失败,请稍后重试!",
        });
      }

      // try {
      //   // 2.请求服务进行提问
      //   this.loading = true;
      //   const res = await this.openai.chat.completions.create(this.queryInfos);
      //   this.loading = false;
      //   // 3.向对话窗口添加对话信息(相应)
      //   const { choices } = res;
      //   this.queryInfos.messages.push(choices[0].message);
      //   // 滚动到底部
      //   this.$refs.messageRef.scrollBottom();
      //   // 更新缓存数据
      //   this.sessionList[this.activeIndex].messages = this.queryInfos.messages;
      // } catch (error) {
      //   this.loading = false;
      //   this.queryInfos.messages.push({
      //     role: "assistant",
      //     content: "加载失败,请稍后重试!",
      //   });
      // }
    },
  },
};
</script>

<style scoped lang="scss">
.pointer {
  cursor: pointer;
}
.inner-html-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgb(216.8, 235.6, 255);
  .page {
    width: 86vw;
    height: 90vh;
    background: #fff;
    box-shadow: 0 0 12px 12px rgb(197.7, 225.9, 255);
    box-sizing: border-box;
    border-radius: 8px;
    overflow: hidden;
    .tips {
      width: 100%;
      height: 32px;
      background: rgb(121.3, 187.1, 255);
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 12px;
      box-sizing: border-box;
      .title {
        font-size: 16px;
      }
      .desc {
        font-size: 14px;
        color: rgb(216.8, 235.6, 255);
      }
    }
    .grid-box {
      display: grid;
      grid-template-columns: 24% auto;
      column-gap: 12px;
    }
    .grid-space-between {
      width: 100%;
      height: calc(100% - 48px);
      .left-container {
        background-color: #f7f8fa;
        padding: 12px;
        height: calc(90vh - 32px - 24px); // 顶部比标题、padding边框
        // 对话列表的展示区域
        .session-area {
          width: 100%;
          height: calc(90vh - 32px - 24px - 12px - 32px); // 边框+按钮
          margin-top: 12px;
          box-sizing: border-box;
          overflow-y: auto;
          .session-item {
            height: 36px;
            line-height: 36px;
            margin-bottom: 8px;
            border-radius: 4px;
            padding: 0 18px;
            background: rgb(199.5, 201, 204);
            color: #f4f5f5;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            .normal-node {
              padding-left: 14px;
            }
            .icon-box {
              visibility: hidden;
              display: grid;
              column-gap: 8px;
              grid-template-columns: repeat(2, 1fr);
              .icon {
                cursor: pointer;
              }
            }
            &:hover .icon-box {
              visibility: visible;
            }
          }
          .session-item-active {
            background: rgb(51.2, 126.4, 204);
            color: #f4f5f5;
            .active-node {
              display: flex;
              align-items: center;
              &::before {
                display: inline-block;
                content: "";
                width: 6px;
                height: 6px;
                background: #fff;
                border-radius: 50%;
                margin-right: 8px;
              }
            }
          }
        }
      }
      .container {
        width: 100%;
        height: calc(90vh - 32px);
        background: #fff;
        border-radius: 8px;
        .message-area {
          height: calc(100% - 40px - 16px - 44px);
          width: calc(100% - 32px);
          padding: 16px 16px 0 16px;
        }
        .user-tokens {
          height: 30px;
          line-height: 30px;
          padding: 0 8px 0 0;
          font-size: 14px;
          color: #c7c8ca;
          user-select: none;
        }
        // 手机端留左侧边框
        .left-space {
          margin-left: 16px;
        }
        .input-area {
          height: 40px;
          display: grid;
          grid-template-columns: auto 90px;
          box-sizing: border-box;
          background: #fff;
          padding: 0 16px 16px 0;
        }
      }
    }
  }
}
</style>
