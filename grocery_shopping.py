import tkinter as tk
from tkinter import messagebox
from datetime import datetime


# ====================== 主程序 ======================
class GroceryApp:
    def __init__(self, root):
        self.root = root
        self.root.title("在线杂货购物实验系统")
        self.root.geometry("800x500")

        # 商品数据
        self.products = [
            {"id": 1, "name": "苹果", "price": 5.99},
            {"id": 2, "name": "牛奶", "price": 12.50},
            {"id": 3, "name": "面包", "price": 8.99},
            {"id": 4, "name": "鸡蛋", "price": 15.00},
            {"id": 5, "name": "矿泉水", "price": 2.50},
        ]

        # 购物车 {商品id: 数量}
        self.cart = {}

        # 创建界面
        self.create_widgets()

    # 创建界面布局
    def create_widgets(self):
        # 顶部标题
        title_label = tk.Label(self.root, text="在线杂货购物实验场景", font=("Arial", 16))
        title_label.pack(pady=10)

        # 主框架
        main_frame = tk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10)

        # 左侧：商品区
        self.left_frame = tk.Frame(main_frame, width=380)
        self.left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        # 右侧：购物车区
        self.right_frame = tk.Frame(main_frame, width=380)
        self.right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # 加载商品
        self.load_products()
        # 加载购物车
        self.load_cart()

    # 显示商品列表
    def load_products(self):
        tk.Label(self.left_frame, text="商品列表", font=("Arial", 14)).pack(anchor="w")
        for p in self.products:
            frame = tk.Frame(self.left_frame)
            frame.pack(anchor="w", pady=5)

            text = f"{p['name']}  ￥{p['price']:.2f}"
            tk.Label(frame, text=text).pack(side=tk.LEFT)

            # 加入购物车按钮
            btn = tk.Button(frame, text="加入购物车",
                            command=lambda pid=p["id"]: self.add_to_cart(pid))
            btn.pack(side=tk.LEFT, padx=5)

    # 加入购物车
    def add_to_cart(self, pid):
        self.cart[pid] = self.cart.get(pid, 0) + 1
        self.load_cart()
        self.log_action(f"添加商品 ID:{pid}")

    # 刷新购物车
    def load_cart(self):
        # 清空旧内容
        for widget in self.right_frame.winfo_children():
            widget.destroy()

        tk.Label(self.right_frame, text="购物车", font=("Arial", 14)).pack(anchor="w")

        total = 0
        for pid, count in self.cart.items():
            p = self.get_product_by_id(pid)
            subtotal = p["price"] * count
            total += subtotal

            frame = tk.Frame(self.right_frame)
            frame.pack(anchor="w", pady=3)

            label_text = f"{p['name']} x{count} = ￥{subtotal:.2f}"
            tk.Label(frame, text=label_text).pack(side=tk.LEFT)

            # 删除按钮
            tk.Button(frame, text="删除",
                      command=lambda pid=pid: self.remove_item(pid)).pack(side=tk.LEFT, padx=3)

        # 总价
        tk.Label(self.right_frame, text=f"------------------------").pack(anchor="w")
        tk.Label(self.right_frame, text=f"总计：￥{total:.2f}", font=("Arial", 12)).pack(anchor="w")

        # 按钮区
        btn_frame = tk.Frame(self.right_frame)
        btn_frame.pack(pady=10)
        tk.Button(btn_frame, text="清空购物车", command=self.clear_cart).grid(row=0, column=0, padx=5)
        tk.Button(btn_frame, text="结算", command=self.checkout).grid(row=0, column=1, padx=5)

    # 辅助：根据ID找商品
    def get_product_by_id(self, pid):
        return next(p for p in self.products if p["id"] == pid)

    # 删除单个商品
    def remove_item(self, pid):
        if pid in self.cart:
            del self.cart[pid]
            self.load_cart()
            self.log_action(f"删除商品 ID:{pid}")

    # 清空购物车
    def clear_cart(self):
        self.cart.clear()
        self.load_cart()
        self.log_action("清空购物车")

    # 结算
    def checkout(self):
        if not self.cart:
            messagebox.showwarning("提示", "购物车为空")
            return
        messagebox.showinfo("结算", "实验结算完成！")
        self.log_action("执行结算")
        self.cart.clear()
        self.load_cart()

    # 记录实验日志（关键！）
    def log_action(self, action):
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log = f"[{now}] {action}\n"
        with open("experiment_log.txt", "a", encoding="utf-8") as f:
            f.write(log)


# 运行
if __name__ == "__main__":
    window = tk.Tk()
    app = GroceryApp(window)
    window.mainloop()
