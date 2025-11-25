#!/usr/bin/env python3
"""
财务数据导入脚本
从 Excel 文件导入数据到后端 PostgreSQL 数据库
"""

import openpyxl
import requests
import json
from datetime import datetime
from typing import List, Dict, Any

# 配置
API_BASE_URL = "http://localhost:4000/api"
EXCEL_FILE_PATH = "/Users/jianguo/Downloads/jiebei/财务数据完整导出_2025-11-17.xlsx"
ACCOUNT_BOOK_ID = "67ea7093-5c40-4357-b520-52f94b676616"  # 个人账本 ID
DEFAULT_YEAR = 2025

class DataImporter:
    def __init__(self):
        self.stats = {
            'expenses_imported': 0,
            'reimbursements_imported': 0,
            'investments_imported': 0,
            'errors': []
        }

    def parse_date(self, date_str: str) -> str:
        """将 MM/DD 格式转换为 YYYY-MM-DD"""
        if not date_str or date_str == '-':
            return None
        try:
            # 解析 MM/DD 格式
            month, day = date_str.split('/')
            return f"{DEFAULT_YEAR}-{month.zfill(2)}-{day.zfill(2)}"
        except:
            print(f"⚠️  日期解析失败: {date_str}")
            return None

    def parse_boolean(self, value: str) -> bool:
        """将中文是/否转换为布尔值"""
        return value == '是'

    def clear_existing_data(self):
        """清空现有的测试数据"""
        print("\n🗑️  清空现有测试数据...")

        # 获取所有数据ID
        budgets = requests.get(f"{API_BASE_URL}/budgets").json().get('data', [])
        reimbursements = requests.get(f"{API_BASE_URL}/reimbursements").json().get('data', [])
        expenses = requests.get(f"{API_BASE_URL}/expenses").json().get('data', [])
        investments = requests.get(f"{API_BASE_URL}/investments").json().get('data', [])

        # 删除预算
        for budget in budgets:
            requests.delete(f"{API_BASE_URL}/budgets/{budget['id']}")
        print(f"   ✓ 删除 {len(budgets)} 个预算")

        # 删除报销
        for reimbursement in reimbursements:
            requests.delete(f"{API_BASE_URL}/reimbursements/{reimbursement['id']}")
        print(f"   ✓ 删除 {len(reimbursements)} 个报销记录")

        # 删除支出
        for expense in expenses:
            requests.delete(f"{API_BASE_URL}/expenses/{expense['id']}")
        print(f"   ✓ 删除 {len(expenses)} 个支出记录")

        # 删除投资
        for investment in investments:
            requests.delete(f"{API_BASE_URL}/investments/{investment['id']}")
        print(f"   ✓ 删除 {len(investment)} 个投资记录")

        print("   ✅ 数据清理完成")

    def import_expenses(self, wb: openpyxl.Workbook):
        """导入支出记录"""
        print("\n📊 导入支出记录...")
        ws = wb['支出记录']
        rows = list(ws.values)

        # 跳过表头
        for row in rows[1:]:
            if not row or not row[0]:  # 跳过空行
                continue

            try:
                # 解析数据
                date = self.parse_date(row[0])
                category = row[1]
                amount = float(row[2])
                description = row[3]
                needs_reimbursement = self.parse_boolean(row[4])
                tags = [] if row[5] == '-' else [tag.strip() for tag in row[5].split(',')]

                # 构建请求数据
                data = {
                    "date": date,
                    "category": category,
                    "amount": amount,
                    "description": description,
                    "needsReimbursement": needs_reimbursement,
                    "tags": tags,
                    "accountBookId": ACCOUNT_BOOK_ID
                }

                # 发送 API 请求
                response = requests.post(f"{API_BASE_URL}/expenses", json=data)

                if response.status_code in [200, 201]:
                    self.stats['expenses_imported'] += 1
                    print(f"   ✓ {date} - {category} - ¥{amount}")
                else:
                    error = f"支出导入失败: {date} - {response.text}"
                    self.stats['errors'].append(error)
                    print(f"   ✗ {error}")

            except Exception as e:
                error = f"支出解析错误: {str(e)} - {row}"
                self.stats['errors'].append(error)
                print(f"   ✗ {error}")

        print(f"   ✅ 成功导入 {self.stats['expenses_imported']} 条支出记录")

    def import_reimbursements(self, wb: openpyxl.Workbook):
        """导入报销记录"""
        print("\n💰 导入报销记录...")
        ws = wb['报销记录']
        rows = list(ws.values)

        # 跳过表头
        for row in rows[1:]:
            if not row or not row[0]:  # 跳过空行
                continue

            try:
                # 解析数据
                date = self.parse_date(row[0])
                item = row[1]
                amount = float(row[2])
                note = row[3] if row[3] != '-' else ''
                status_map = {'待报销': 'pending', '已报销': 'completed', '已批准': 'approved'}
                status = status_map.get(row[4], 'pending')
                reimbursed_date = self.parse_date(row[5]) if row[5] != '-' else None

                # 构建请求数据
                data = {
                    "date": date,
                    "item": item,
                    "amount": amount,
                    "note": note,
                    "status": status
                }

                if reimbursed_date:
                    data["reimbursedDate"] = reimbursed_date

                # 发送 API 请求
                response = requests.post(f"{API_BASE_URL}/reimbursements", json=data)

                if response.status_code in [200, 201]:
                    self.stats['reimbursements_imported'] += 1
                    print(f"   ✓ {date} - {item} - ¥{amount} ({status})")
                else:
                    error = f"报销导入失败: {date} - {response.text}"
                    self.stats['errors'].append(error)
                    print(f"   ✗ {error}")

            except Exception as e:
                error = f"报销解析错误: {str(e)} - {row}"
                self.stats['errors'].append(error)
                print(f"   ✗ {error}")

        print(f"   ✅ 成功导入 {self.stats['reimbursements_imported']} 条报销记录")

    def import_investments(self, wb: openpyxl.Workbook):
        """导入投资记录"""
        print("\n📈 导入投资记录...")
        ws = wb['投资记录']
        rows = list(ws.values)

        # 跳过表头
        for row in rows[1:]:
            if not row or not row[0]:  # 跳过空行
                continue

            try:
                # 解析数据
                name = row[0]
                type_ = row[1]
                amount = float(row[2])
                status_map = {'持有中': 'holding', '已卖出': 'sold'}
                status = status_map.get(row[3], 'holding')
                purchase_date = self.parse_date(row[4])
                note = row[5] if len(row) > 5 and row[5] != '-' else None

                # 构建请求数据
                data = {
                    "name": name,
                    "type": type_,
                    "amount": amount,
                    "status": status,
                    "purchaseDate": purchase_date
                }

                if note:
                    data["note"] = note

                # 发送 API 请求
                response = requests.post(f"{API_BASE_URL}/investments", json=data)

                if response.status_code in [200, 201]:
                    self.stats['investments_imported'] += 1
                    print(f"   ✓ {name} - {type_} - ¥{amount}")
                else:
                    error = f"投资导入失败: {name} - {response.text}"
                    self.stats['errors'].append(error)
                    print(f"   ✗ {error}")

            except Exception as e:
                error = f"投资解析错误: {str(e)} - {row}"
                self.stats['errors'].append(error)
                print(f"   ✗ {error}")

        print(f"   ✅ 成功导入 {self.stats['investments_imported']} 条投资记录")

    def verify_import(self):
        """验证导入结果"""
        print("\n✅ 验证导入结果...")

        # 获取统计数据
        expenses_stats = requests.get(f"{API_BASE_URL}/expenses/stats").json()
        expenses = requests.get(f"{API_BASE_URL}/expenses").json()
        reimbursements = requests.get(f"{API_BASE_URL}/reimbursements").json()
        investments = requests.get(f"{API_BASE_URL}/investments").json()

        print(f"   支出记录: {expenses_stats['data']['totalCount']} 条")
        print(f"   报销记录: {len(reimbursements['data'])} 条")
        print(f"   投资记录: {len(investments['data'])} 条")
        print(f"   总支出金额: ¥{expenses_stats['data']['totalAmount']}")

    def run(self):
        """执行完整的导入流程"""
        print("=" * 60)
        print("🚀 开始导入财务数据")
        print("=" * 60)

        # 检查后端服务器
        try:
            health = requests.get(f"http://localhost:4000/health")
            if health.status_code != 200:
                print("❌ 后端服务器未运行！请先启动后端服务器")
                return
            print("✅ 后端服务器运行正常")
        except:
            print("❌ 无法连接到后端服务器！请确保后端在 http://localhost:4000 运行")
            return

        # 加载 Excel 文件
        try:
            wb = openpyxl.load_workbook(EXCEL_FILE_PATH, read_only=True, data_only=True)
            print(f"✅ 成功加载 Excel 文件")
        except Exception as e:
            print(f"❌ 无法加载 Excel 文件: {e}")
            return

        # 执行导入
        self.clear_existing_data()
        self.import_expenses(wb)
        self.import_reimbursements(wb)
        self.import_investments(wb)
        self.verify_import()

        # 打印汇总
        print("\n" + "=" * 60)
        print("📊 导入完成汇总")
        print("=" * 60)
        print(f"   支出记录: {self.stats['expenses_imported']} 条")
        print(f"   报销记录: {self.stats['reimbursements_imported']} 条")
        print(f"   投资记录: {self.stats['investments_imported']} 条")

        if self.stats['errors']:
            print(f"\n⚠️  发现 {len(self.stats['errors'])} 个错误:")
            for error in self.stats['errors']:
                print(f"   - {error}")
        else:
            print("\n🎉 所有数据导入成功，没有错误！")

if __name__ == '__main__':
    importer = DataImporter()
    importer.run()
