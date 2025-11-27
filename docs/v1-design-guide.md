# V1设计指南：基于业界最佳实践

> **目标读者**: AI开发者
> **文档性质**: 可执行的设计方案
> **基于**: Firefly III、MoneyNote等优秀开源项目的精华提炼
> **适配**: 我们项目的实际情况（V1简化版多账本记账工具）

---

## 🔗 参考项目链接

本设计指南基于以下优秀开源项目的最佳实践提炼而成：

### 1. Firefly III ⭐⭐⭐⭐⭐（主要参考）

**基本信息**：
- **GitHub**: https://github.com/firefly-iii/firefly-iii
- **官网**: https://www.firefly-iii.org/
- **文档**: https://docs.firefly-iii.org/
- **演示站**: https://demo.firefly-iii.org/
- **Stars**: 15k+
- **技术栈**: PHP (Laravel)
- **许可**: AGPL-3.0

**我们采用的精华**：
- ✅ 双标签系统（Category + Tag）
- ✅ 余额自动计算逻辑
- ✅ 统计报表设计思路
- ✅ 交易的源-目标模型概念

**Docker快速体验**：
```bash
docker run -d \
  -v firefly_iii_upload:/var/www/html/storage/upload \
  -v firefly_iii_db:/var/www/html/storage/database \
  -p 8080:8080 \
  -e APP_KEY=SomeRandomStringOf32CharsExactly \
  -e DB_CONNECTION=sqlite \
  fireflyiii/core:latest
```

---

### 2. MoneyNote（九快记账）⭐⭐⭐⭐（最接近我们需求）

**基本信息**：
- **GitHub（API）**: https://github.com/getmoneynote/moneynote-api
- **GitHub（前端）**: https://github.com/getmoneynote/moneynote-web
- **GitHub（App）**: https://github.com/getmoneynote/moneynote-mobile
- **官网**: https://moneynote.com/
- **Stars**: 500+
- **技术栈**: Java (Spring Boot 3) + React + Flutter
- **许可**: MIT

**我们采用的精华**：
- ✅ 多账本概念和实现
- ✅ 账本切换交互设计
- ✅ 账本类型的处理方式
- ✅ Spring Boot 3最佳实践

**Docker快速部署**：
```bash
# 克隆仓库
git clone https://github.com/getmoneynote/moneynote-api.git
cd moneynote-api

# 使用Docker Compose启动
docker-compose up -d
```

---

### 3. GnuCash ⭐⭐⭐（理解复式记账原理）

**基本信息**：
- **GitHub**: https://github.com/Gnucash/gnucash
- **官网**: https://www.gnucash.org/
- **文档**: https://www.gnucash.org/docs.phtml
- **Wiki**: https://wiki.gnucash.org/
- **Stars**: 4k+
- **技术栈**: C/C++
- **许可**: GPL

**我们参考的概念**：
- ⚠️ 会计科目的层级结构（理解即可）
- ✅ 交易的"转账"概念
- ✅ 期初余额的处理方式
- ❌ 复式记账（太复杂，V1不采用）

---

### 4. Beancount ⭐⭐⭐（纯文本记账理念）

**基本信息**：
- **GitHub**: https://github.com/beancount/beancount
- **文档**: https://beancount.github.io/docs/
- **教程**: https://beancount.github.io/docs/tutorial.html
- **Stars**: 3k+
- **技术栈**: Python
- **许可**: GPL-2.0

**我们参考的思路**：
- ✅ 账户命名的层级方式（用冒号分隔）
- ✅ 交易的简洁表达方式
- ⚠️ 纯文本存储思路（可考虑导出功能）

**示例账本格式**：
```beancount
2025-11-26 * "午餐"
  Assets:Bank:Alipay   -50.00 CNY
  Expenses:Food         50.00 CNY

2025-11-26 * "工资"
  Assets:Bank:ICBC     8000.00 CNY
  Income:Salary       -8000.00 CNY
```

---

### 5. hledger ⭐⭐⭐（命令行记账工具）

**基本信息**：
- **GitHub**: https://github.com/simonmichael/hledger
- **官网**: https://hledger.org/
- **文档**: https://hledger.org/docs.html
- **快速入门**: https://hledger.org/quickstart.html
- **Stars**: 2.5k+
- **技术栈**: Haskell
- **许可**: GPL-3.0

**我们参考的特性**：
- ✅ 强大的命令行查询能力
- ✅ 多种报表生成方式
- ⚠️ 纯文本格式（理解思路）

---

### 6. Ledger ⭐⭐（纯文本记账的鼻祖）

**基本信息**：
- **GitHub**: https://github.com/ledger/ledger
- **官网**: https://ledger-cli.org/
- **文档**: https://ledger-cli.org/doc/ledger3.html
- **Stars**: 5k+
- **技术栈**: C++
- **许可**: BSD-3-Clause

**历史意义**：
- 纯文本记账的开创者
- Beancount和hledger都受其启发
- 我们不直接参考，但理解其设计哲学

---

## 📊 功能对比表

| 功能特性 | Firefly III | MoneyNote | GnuCash | Beancount | 我们的V1 |
|---------|-------------|-----------|---------|-----------|---------|
| **账本模型** |
| 多账本/账户 | ✅ 多账户 | ✅ 多账本 | ✅ 多科目 | ✅ 多账户 | ✅ 多账本 |
| 复式记账 | ✅ 强制 | ❌ | ✅ 强制 | ✅ 强制 | ❌ |
| 账本独立性 | 部分独立 | ✅ 完全独立 | 相互关联 | 相互关联 | ✅ 完全独立 |
| **标签系统** |
| Category标签 | ✅ | ✅ | ✅ | ✅ | ✅ 必选 |
| Label标签 | ✅ | ✅ | ❌ | ✅ | ✅ 可选多个 |
| 标签作用域 | 全局 | 全局 | 全局 | 全局 | ✅ 全局+专属 |
| **功能特性** |
| 余额自动计算 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 预算管理 | ✅ 强大 | ✅ | ✅ | ✅ | ❌ (V2) |
| 统计报表 | ✅ 丰富 | ✅ | ✅ 专业 | ✅ 灵活 | ✅ 基础 |
| 多币种 | ✅ | ✅ | ✅ | ✅ | ❌ (V2) |
| 导入导出 | ✅ CSV | ✅ | ✅ 多格式 | ✅ 纯文本 | ⏭️ 后续 |
| **用户体验** |
| 学习曲线 | 中 | 低 | 高 | 高 | 低 |
| 界面友好度 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| 移动端支持 | ❌ | ✅ | ❌ | ❌ | ⏭️ 后续 |

---

## 🎯 采用策略总结

### ✅ 完全采用的特性

| 特性 | 来源项目 | 采用方式 |
|------|---------|---------|
| 多账本独立概念 | MoneyNote | 完全照搬 |
| 双标签系统 | Firefly III | Category(必选) + Label(可选) |
| 余额自动计算 | Firefly III | 完整实现包括编辑/删除的处理 |
| 统计报表思路 | Firefly III | 简化实现月度/分类/趋势 |
| 账本切换交互 | MoneyNote | 参考UI/UX设计 |

---

### ⚠️ 简化采用的特性

| 特性 | 来源项目 | 简化方式 | 原因 |
|------|---------|---------|------|
| 预算功能 | Firefly III | V1不做，V2再加 | 降低复杂度 |
| 拆分交易 | Firefly III | V1不支持 | 保持简单 |
| 账户层级 | Beancount | 扁平化，不支持层级 | 降低门槛 |
| 多币种 | 所有项目 | V1不做 | 聚焦核心 |

---

### ❌ 不采用的特性

| 特性 | 来源项目 | 不采用原因 |
|------|---------|-----------|
| 复式记账 | Firefly III/GnuCash | 对个人用户太复杂 |
| 投资管理 | GnuCash | 不在范围内 |
| 纯文本存储 | Beancount/hledger | 用户门槛高 |
| 命令行操作 | hledger/ledger | 需要图形界面 |

---

## 📖 快速学习路径

### Week 1: 体验产品（建议）

**Day 1-2**: 体验Firefly III
```bash
# Docker启动
docker run -d -p 8080:8080 \
  -e APP_KEY=12345678901234567890123456789012 \
  -e DB_CONNECTION=sqlite \
  fireflyiii/core:latest

# 访问 http://localhost:8080
# 创建账户、记录交易、查看统计
```

**Day 3-4**: 体验MoneyNote
- 下载App或使用Docker部署
- 创建多个账本
- 体验账本切换
- 理解账本独立性

**Day 5**: 对比总结
- 列出两个产品的优缺点
- 思考我们要做什么、不做什么
- 明确V1的核心功能

---

### Week 2: 阅读源码（可选）

**重点文件**（如果有时间）：

**Firefly III**：
- `app/Models/Account.php` - 账户模型
- `app/Services/Internal/Update/AccountUpdateService.php` - 余额更新
- `app/Models/Transaction.php` - 交易模型
- `app/Models/Category.php` - 分类模型

**MoneyNote**：
- `src/main/java/com/moneynote/api/entity/AccountBook.java`
- `src/main/java/com/moneynote/api/controller/AccountBookController.java`
- `src/main/java/com/moneynote/api/service/TransactionService.java`

---

### Week 3: 直接开始（推荐）

**不需要深入研究源码，直接按本设计指南实现即可！**

本文档已经提炼了所有精华：
- ✅ 数据模型已优化
- ✅ 业务逻辑已完善
- ✅ 代码示例已就绪
- ✅ 检查清单已准备

---

## 📋 核心设计原则（来自业界最佳实践）

### 原则1: 账本完全独立（MoneyNote实践）

**业界实践**：
- MoneyNote：每个账本是独立的记账单元
- Firefly III：每个账户独立管理余额

**我们的应用**：
```
每个账本（AccountBook）：
✅ 有独立的交易列表（transactions）
✅ 有独立的余额（balance）
✅ 有独立的标签（tags，可选全局或专属）
✅ 统计时只看单个账本的数据

❌ 账本间不自动关联
❌ 不做跨账本数据汇总（V1）
```

---

### 原则2: 双标签系统（Firefly III实践）

**业界实践**：
- Firefly III使用Category（主分类）+ Tag（灵活标记）
- 经过大量用户验证，这种设计平衡了结构化和灵活性

**我们的应用**：
```
Category Tag（分类标签）：
- 必选（每笔交易必须选一个）
- 用于主要分类（餐饮、交通、工资、广告费）
- 用于统计饼图和分类汇总

Label Tag（普通标签）：
- 可选（每笔交易可以选0-N个）
- 灵活标记（#报销、#重要、#垫付、#旅游）
- 用于筛选和多维度查看
```

---

### 原则3: 余额自动计算（所有项目共识）

**业界实践**：
- 所有成熟记账软件都自动计算余额
- 用户不应该手动输入余额

**我们的应用**：
```javascript
// 余额计算公式（Firefly III同款）
当前余额 = 初始余额 + 所有收入 - 所有支出

// 实现要点：
1. 创建账本时设置初始余额（opening_balance）
2. 每次创建交易自动更新余额
3. 编辑/删除交易也要更新余额
4. 余额字段只读，用户不能修改
```

---

## 🗂️ 数据模型设计（基于最佳实践）

### 1. AccountBook（账本表）- 核心实体

**参考来源**: MoneyNote的AccountBook + Firefly III的Account

```sql
CREATE TABLE account_book (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,           -- 账本名称（唯一）
    type ENUM('personal', 'business', 'partner') -- 账本类型（只是标签）
         NOT NULL DEFAULT 'personal',

    -- 余额相关（Firefly III实践）
    opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,  -- 期初余额
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,  -- 当前余额（自动计算）

    -- 显示相关（MoneyNote实践）
    color VARCHAR(20) DEFAULT '#1890ff',         -- 账本颜色
    icon VARCHAR(50) DEFAULT 'book',             -- 账本图标

    -- 系统相关
    is_default BOOLEAN DEFAULT FALSE,            -- 是否默认账本（唯一）
    description TEXT,                            -- 账本描述
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 索引
    INDEX idx_type (type),
    INDEX idx_is_default (is_default)
);
```

**关键设计点**：
1. ✅ `name`必须唯一（Firefly III实践）
2. ✅ `current_balance`自动计算，不允许手动修改
3. ✅ `is_default`确保系统只有一个默认账本
4. ✅ `type`只是分类标签，不影响功能

---

### 2. Transaction（交易表）- 核心实体

**参考来源**: Firefly III的Transaction简化版

```sql
CREATE TABLE transaction (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_book_id BIGINT NOT NULL,             -- 关联账本

    -- 交易基本信息（所有项目共识）
    type ENUM('income', 'expense') NOT NULL,     -- 交易类型
    amount DECIMAL(15, 2) NOT NULL,              -- 金额（必须>0）
    transaction_date DATE NOT NULL,              -- 交易日期

    -- 分类和标签（Firefly III实践）
    category_tag_id BIGINT NOT NULL,             -- 分类标签（必选）

    -- 描述信息
    description VARCHAR(500),                    -- 交易描述
    notes TEXT,                                  -- 备注（用户可手动写"我垫付"等）

    -- 系统信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 外键和索引
    FOREIGN KEY (account_book_id) REFERENCES account_book(id) ON DELETE CASCADE,
    FOREIGN KEY (category_tag_id) REFERENCES tag(id),

    INDEX idx_account_book (account_book_id),
    INDEX idx_type (type),
    INDEX idx_date (transaction_date),
    INDEX idx_category (category_tag_id)
);
```

**关键设计点**：
1. ✅ `amount`必须大于0（Firefly III实践）
2. ✅ `type`区分收入/支出（不用正负数，更清晰）
3. ✅ `category_tag_id`必填（保证数据质量）
4. ✅ 删除账本时级联删除交易（数据一致性）

---

### 3. Tag（标签表）- 灵活的分类系统

**参考来源**: Firefly III的Category + Tag设计

```sql
CREATE TABLE tag (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,                   -- 标签名称

    -- 标签类型（Firefly III实践）
    tag_type ENUM('category', 'label') NOT NULL DEFAULT 'label',

    -- 作用域（MoneyNote + 我们的创新）
    scope ENUM('global', 'account_book') NOT NULL DEFAULT 'global',
    account_book_id BIGINT,                      -- 账本专属标签的所属账本

    -- 显示相关
    color VARCHAR(20) DEFAULT '#666666',
    icon VARCHAR(50),

    -- 系统信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 约束
    UNIQUE KEY uk_name_scope_book (name, scope, account_book_id),
    FOREIGN KEY (account_book_id) REFERENCES account_book(id) ON DELETE CASCADE,

    INDEX idx_type (tag_type),
    INDEX idx_scope (scope)
);
```

**关键设计点**：
1. ✅ `tag_type`区分Category和Label
2. ✅ `scope`支持全局和账本专属（灵活性）
3. ✅ 唯一约束确保同一范围内标签名不重复
4. ✅ Category和Label都存在同一表（简化设计）

---

### 4. TransactionTag（交易-标签关联表）

**参考来源**: 标准多对多关系表设计

```sql
CREATE TABLE transaction_tag (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    transaction_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 外键
    FOREIGN KEY (transaction_id) REFERENCES transaction(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE,

    -- 唯一约束（同一交易不能重复添加同一标签）
    UNIQUE KEY uk_transaction_tag (transaction_id, tag_id),

    INDEX idx_transaction (transaction_id),
    INDEX idx_tag (tag_id)
);
```

**关键设计点**：
1. ✅ 支持一笔交易关联多个标签
2. ✅ 唯一约束防止重复关联
3. ✅ 级联删除保证数据一致性

---

## 🔧 核心业务逻辑实现（基于最佳实践）

### 1. 余额计算（Firefly III同款）

**场景**: 创建、编辑、删除交易时自动更新账本余额

```java
/**
 * 余额计算服务
 * 参考: Firefly III的余额更新机制
 */
@Service
public class BalanceCalculationService {

    /**
     * 创建交易后更新余额
     */
    public void updateBalanceAfterCreate(Transaction transaction) {
        AccountBook book = transaction.getAccountBook();

        if (transaction.getType() == TransactionType.INCOME) {
            // 收入：余额增加
            book.setCurrentBalance(
                book.getCurrentBalance().add(transaction.getAmount())
            );
        } else {
            // 支出：余额减少
            book.setCurrentBalance(
                book.getCurrentBalance().subtract(transaction.getAmount())
            );
        }

        accountBookRepository.save(book);
    }

    /**
     * 编辑交易后更新余额
     * 关键：先回滚旧交易的影响，再应用新交易
     */
    public void updateBalanceAfterEdit(
        Transaction oldTransaction,
        Transaction newTransaction
    ) {
        AccountBook book = oldTransaction.getAccountBook();
        BigDecimal balance = book.getCurrentBalance();

        // 1. 回滚旧交易的影响
        if (oldTransaction.getType() == TransactionType.INCOME) {
            balance = balance.subtract(oldTransaction.getAmount());
        } else {
            balance = balance.add(oldTransaction.getAmount());
        }

        // 2. 应用新交易的影响
        if (newTransaction.getType() == TransactionType.INCOME) {
            balance = balance.add(newTransaction.getAmount());
        } else {
            balance = balance.subtract(newTransaction.getAmount());
        }

        book.setCurrentBalance(balance);
        accountBookRepository.save(book);
    }

    /**
     * 删除交易后更新余额
     */
    public void updateBalanceAfterDelete(Transaction transaction) {
        AccountBook book = transaction.getAccountBook();

        // 回滚交易的影响
        if (transaction.getType() == TransactionType.INCOME) {
            book.setCurrentBalance(
                book.getCurrentBalance().subtract(transaction.getAmount())
            );
        } else {
            book.setCurrentBalance(
                book.getCurrentBalance().add(transaction.getAmount())
            );
        }

        accountBookRepository.save(book);
    }

    /**
     * 重新计算账本余额（修复数据用）
     * 参考: Firefly III的余额修复功能
     */
    public void recalculateBalance(Long accountBookId) {
        AccountBook book = accountBookRepository.findById(accountBookId)
            .orElseThrow();

        // 从初始余额开始重新计算
        BigDecimal balance = book.getOpeningBalance();

        // 遍历所有交易
        List<Transaction> transactions = transactionRepository
            .findByAccountBookIdOrderByTransactionDateAsc(accountBookId);

        for (Transaction t : transactions) {
            if (t.getType() == TransactionType.INCOME) {
                balance = balance.add(t.getAmount());
            } else {
                balance = balance.subtract(t.getAmount());
            }
        }

        book.setCurrentBalance(balance);
        accountBookRepository.save(book);
    }
}
```

---

### 2. 默认账本管理（业界共识）

**场景**: 确保系统有且仅有一个默认账本

```java
/**
 * 默认账本管理
 * 参考: 所有记账软件的共同实践
 */
@Service
public class DefaultAccountBookService {

    /**
     * 设置默认账本
     */
    @Transactional
    public void setDefault(Long accountBookId) {
        // 1. 取消当前默认账本
        AccountBook currentDefault = accountBookRepository
            .findByIsDefaultTrue()
            .orElse(null);

        if (currentDefault != null) {
            currentDefault.setIsDefault(false);
            accountBookRepository.save(currentDefault);
        }

        // 2. 设置新的默认账本
        AccountBook newDefault = accountBookRepository
            .findById(accountBookId)
            .orElseThrow();

        newDefault.setIsDefault(true);
        accountBookRepository.save(newDefault);
    }

    /**
     * 获取默认账本（如果没有则返回第一个）
     */
    public AccountBook getDefaultOrFirst() {
        return accountBookRepository.findByIsDefaultTrue()
            .orElseGet(() -> {
                return accountBookRepository.findFirstByOrderByCreatedAtAsc()
                    .orElseThrow(() -> new RuntimeException("没有任何账本"));
            });
    }

    /**
     * 删除账本时的保护逻辑
     */
    public void validateBeforeDelete(Long accountBookId) {
        AccountBook book = accountBookRepository.findById(accountBookId)
            .orElseThrow();

        // 1. 检查是否是默认账本
        if (book.getIsDefault()) {
            long totalBooks = accountBookRepository.count();
            if (totalBooks <= 1) {
                throw new BusinessException("不能删除唯一的账本");
            }
            throw new BusinessException("不能删除默认账本，请先设置其他账本为默认");
        }

        // 2. 检查是否是唯一账本
        long totalBooks = accountBookRepository.count();
        if (totalBooks <= 1) {
            throw new BusinessException("不能删除唯一的账本");
        }
    }
}
```

---

### 3. 标签系统实现（Firefly III实践）

**场景**: Category Tag必选，Label Tag可选多个

```java
/**
 * 标签服务
 * 参考: Firefly III的标签系统
 */
@Service
public class TagService {

    /**
     * 为交易添加标签（带验证）
     */
    public void addTagsToTransaction(
        Long transactionId,
        Long categoryTagId,
        List<Long> labelTagIds
    ) {
        Transaction transaction = transactionRepository
            .findById(transactionId)
            .orElseThrow();

        // 1. 验证并设置Category Tag（必选）
        Tag categoryTag = tagRepository.findById(categoryTagId)
            .orElseThrow(() -> new BusinessException("分类标签不存在"));

        if (categoryTag.getTagType() != TagType.CATEGORY) {
            throw new BusinessException("必须选择分类标签（Category Tag）");
        }

        // 验证标签作用域
        validateTagScope(categoryTag, transaction.getAccountBook());

        transaction.setCategoryTag(categoryTag);

        // 2. 添加Label Tags（可选）
        if (labelTagIds != null && !labelTagIds.isEmpty()) {
            for (Long labelTagId : labelTagIds) {
                Tag labelTag = tagRepository.findById(labelTagId)
                    .orElseThrow();

                if (labelTag.getTagType() != TagType.LABEL) {
                    throw new BusinessException("只能添加普通标签（Label Tag）");
                }

                validateTagScope(labelTag, transaction.getAccountBook());

                // 创建关联
                TransactionTag transactionTag = new TransactionTag();
                transactionTag.setTransaction(transaction);
                transactionTag.setTag(labelTag);
                transactionTagRepository.save(transactionTag);
            }
        }

        transactionRepository.save(transaction);
    }

    /**
     * 验证标签作用域
     * 全局标签：所有账本都能用
     * 账本专属标签：只能在对应账本使用
     */
    private void validateTagScope(Tag tag, AccountBook accountBook) {
        if (tag.getScope() == TagScope.ACCOUNT_BOOK) {
            if (!tag.getAccountBook().getId().equals(accountBook.getId())) {
                throw new BusinessException(
                    String.format("标签'%s'只能在账本'%s'中使用",
                        tag.getName(),
                        tag.getAccountBook().getName())
                );
            }
        }
    }

    /**
     * 获取账本可用的标签列表
     * 参考: MoneyNote的标签过滤逻辑
     */
    public List<Tag> getAvailableTags(Long accountBookId, TagType tagType) {
        AccountBook book = accountBookRepository.findById(accountBookId)
            .orElseThrow();

        // 返回：全局标签 + 该账本的专属标签
        return tagRepository.findByTagTypeAndAvailableForAccountBook(
            tagType,
            accountBookId
        );
    }
}
```

---

### 4. 统计查询（Firefly III实践）

**场景**: 月度统计、分类统计、趋势图

```java
/**
 * 统计服务
 * 参考: Firefly III的报表查询逻辑
 */
@Service
public class StatisticsService {

    /**
     * 月度统计卡片
     */
    public MonthlyStatistics getMonthlyStats(
        Long accountBookId,
        YearMonth month
    ) {
        LocalDate startDate = month.atDay(1);
        LocalDate endDate = month.atEndOfMonth();

        // 1. 查询本月收入
        BigDecimal income = transactionRepository
            .sumAmountByAccountBookAndTypeAndDateBetween(
                accountBookId,
                TransactionType.INCOME,
                startDate,
                endDate
            ).orElse(BigDecimal.ZERO);

        // 2. 查询本月支出
        BigDecimal expense = transactionRepository
            .sumAmountByAccountBookAndTypeAndDateBetween(
                accountBookId,
                TransactionType.EXPENSE,
                startDate,
                endDate
            ).orElse(BigDecimal.ZERO);

        // 3. 获取当前余额
        AccountBook book = accountBookRepository.findById(accountBookId)
            .orElseThrow();

        return MonthlyStatistics.builder()
            .income(income)
            .expense(expense)
            .balance(book.getCurrentBalance())
            .month(month)
            .build();
    }

    /**
     * 分类统计（用于饼图）
     * 参考: Firefly III的Category统计
     */
    public List<CategoryStatistics> getCategoryStats(
        Long accountBookId,
        LocalDate startDate,
        LocalDate endDate,
        TransactionType type
    ) {
        // 使用数据库GROUP BY进行聚合
        return transactionRepository
            .groupByCategory(accountBookId, startDate, endDate, type);
    }

    /**
     * 趋势数据（用于折线图）
     * 参考: Firefly III的趋势图
     */
    public List<TrendData> getTrendData(
        Long accountBookId,
        int months  // 最近N个月
    ) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(months - 1)
            .withDayOfMonth(1);

        List<TrendData> result = new ArrayList<>();

        // 按月循环统计
        YearMonth current = YearMonth.from(startDate);
        YearMonth end = YearMonth.from(endDate);

        while (!current.isAfter(end)) {
            LocalDate monthStart = current.atDay(1);
            LocalDate monthEnd = current.atEndOfMonth();

            BigDecimal income = transactionRepository
                .sumAmountByAccountBookAndTypeAndDateBetween(
                    accountBookId,
                    TransactionType.INCOME,
                    monthStart,
                    monthEnd
                ).orElse(BigDecimal.ZERO);

            BigDecimal expense = transactionRepository
                .sumAmountByAccountBookAndTypeAndDateBetween(
                    accountBookId,
                    TransactionType.EXPENSE,
                    monthStart,
                    monthEnd
                ).orElse(BigDecimal.ZERO);

            result.add(TrendData.builder()
                .month(current)
                .income(income)
                .expense(expense)
                .build());

            current = current.plusMonths(1);
        }

        return result;
    }
}
```

---

## 🎨 前端设计指南（基于优秀实践）

### 1. 账本切换（MoneyNote实践）

**位置**: 顶部导航栏

```jsx
/**
 * 账本切换器
 * 参考: MoneyNote的账本切换交互
 */
function AccountBookSwitcher() {
    const [currentBook, setCurrentBook] = useState(null);
    const [books, setBooks] = useState([]);

    return (
        <Select
            value={currentBook?.id}
            onChange={(bookId) => {
                // 1. 切换当前账本
                const book = books.find(b => b.id === bookId);
                setCurrentBook(book);

                // 2. 触发数据刷新
                refreshTransactions(bookId);
                refreshStatistics(bookId);
            }}
            style={{ minWidth: 200 }}
        >
            {books.map(book => (
                <Select.Option key={book.id} value={book.id}>
                    <Space>
                        {/* 颜色指示器 */}
                        <Badge color={book.color} />

                        {/* 账本图标 */}
                        <Icon type={book.icon} />

                        {/* 账本名称 */}
                        <span>{book.name}</span>

                        {/* 默认标记 */}
                        {book.isDefault && <Tag size="small">默认</Tag>}
                    </Space>
                </Select.Option>
            ))}
        </Select>
    );
}
```

---

### 2. 统计界面（Firefly III实践）

**布局**: 卡片 + 图表

```jsx
/**
 * 统计页面
 * 参考: Firefly III的报表布局
 */
function StatisticsPage({ accountBookId }) {
    const [stats, setStats] = useState(null);

    return (
        <div className="statistics-page">
            {/* 顶部：当前账本标识 */}
            <PageHeader
                title={currentBook.name}
                subTitle={`余额: ¥${currentBook.currentBalance}`}
                extra={<AccountBookSwitcher />}
            />

            {/* 月度统计卡片 */}
            <Row gutter={16}>
                <Col span={8}>
                    <StatCard
                        title="本月收入"
                        value={stats.income}
                        prefix="¥"
                        valueStyle={{ color: '#3f8600' }}
                        icon={<ArrowUpOutlined />}
                    />
                </Col>
                <Col span={8}>
                    <StatCard
                        title="本月支出"
                        value={stats.expense}
                        prefix="¥"
                        valueStyle={{ color: '#cf1322' }}
                        icon={<ArrowDownOutlined />}
                    />
                </Col>
                <Col span={8}>
                    <StatCard
                        title="账本余额"
                        value={stats.balance}
                        prefix="¥"
                        icon={<WalletOutlined />}
                    />
                </Col>
            </Row>

            {/* 分类统计（饼图） */}
            <Card title="支出分类">
                <Pie
                    data={stats.categories}
                    angleField="amount"
                    colorField="name"
                />
            </Card>

            {/* 趋势图（折线图） */}
            <Card title="收支趋势（最近6个月）">
                <Line
                    data={stats.trend}
                    xField="month"
                    yField="amount"
                    seriesField="type"
                />
            </Card>
        </div>
    );
}
```

---

### 3. 交易表单（业界共识）

**设计原则**: 简洁、快速、智能默认值

```jsx
/**
 * 交易表单
 * 参考: Firefly III的表单设计 + MoneyNote的简洁风格
 */
function TransactionForm({ accountBookId, onSuccess }) {
    return (
        <Form onFinish={handleSubmit}>
            {/* 交易类型（Tab切换，直观） */}
            <Form.Item name="type">
                <Tabs>
                    <Tabs.TabPane
                        tab={<span><PlusOutlined /> 收入</span>}
                        key="income"
                    />
                    <Tabs.TabPane
                        tab={<span><MinusOutlined /> 支出</span>}
                        key="expense"
                    />
                </Tabs>
            </Form.Item>

            {/* 金额输入（大号，醒目） */}
            <Form.Item
                name="amount"
                rules={[
                    { required: true, message: '请输入金额' },
                    { type: 'number', min: 0.01, message: '金额必须大于0' }
                ]}
            >
                <InputNumber
                    prefix="¥"
                    placeholder="0.00"
                    style={{ width: '100%', fontSize: 24 }}
                />
            </Form.Item>

            {/* 分类标签（必选，下拉） */}
            <Form.Item
                name="categoryTagId"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
            >
                <Select
                    placeholder="选择分类"
                    showSearch
                    filterOption={(input, option) =>
                        option.children.toLowerCase().includes(input.toLowerCase())
                    }
                >
                    {categoryTags.map(tag => (
                        <Select.Option key={tag.id} value={tag.id}>
                            <Space>
                                <Badge color={tag.color} />
                                {tag.icon && <Icon type={tag.icon} />}
                                {tag.name}
                            </Space>
                        </Select.Option>
                    ))}
                </Select>
            </Form.Item>

            {/* 普通标签（可选多个） */}
            <Form.Item name="labelTagIds" label="标签（可选）">
                <Select
                    mode="multiple"
                    placeholder="添加标签"
                    showSearch
                >
                    {labelTags.map(tag => (
                        <Select.Option key={tag.id} value={tag.id}>
                            <Tag color={tag.color}>{tag.name}</Tag>
                        </Select.Option>
                    ))}
                </Select>
            </Form.Item>

            {/* 日期（默认今天） */}
            <Form.Item
                name="transactionDate"
                label="日期"
                initialValue={moment()}
            >
                <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            {/* 备注（用户可以手动写"我垫付"等） */}
            <Form.Item name="notes" label="备注">
                <TextArea
                    placeholder="例如：我垫付、为TikTok业务垫付广告费"
                    rows={3}
                />
            </Form.Item>

            {/* 提交按钮 */}
            <Form.Item>
                <Button type="primary" htmlType="submit" block size="large">
                    保存
                </Button>
            </Form.Item>
        </Form>
    );
}
```

---

## ✅ 实现检查清单（确保质量）

### 阶段1: 数据模型 ✓

- [ ] AccountBook表创建正确
- [ ] Transaction表创建正确
- [ ] Tag表创建正确
- [ ] TransactionTag关联表创建正确
- [ ] 所有外键约束正确
- [ ] 所有索引创建完成
- [ ] 唯一约束正确（账本名称、默认账本、标签等）

---

### 阶段2: 核心服务 ✓

**余额计算服务**:
- [ ] 创建交易后余额正确更新
- [ ] 编辑交易后余额正确更新
- [ ] 删除交易后余额正确更新
- [ ] 余额修复功能可用

**默认账本服务**:
- [ ] 设置默认账本功能正常
- [ ] 确保只有一个默认账本
- [ ] 删除账本的保护逻辑正确

**标签服务**:
- [ ] Category Tag验证正确（必选）
- [ ] Label Tag可以添加多个
- [ ] 标签作用域验证正确（全局/账本专属）
- [ ] 获取可用标签列表正确

**统计服务**:
- [ ] 月度统计数据准确
- [ ] 分类统计数据准确
- [ ] 趋势数据准确

---

### 阶段3: API接口 ✓

**账本管理**:
- [ ] POST /api/account-books（创建账本）
- [ ] GET /api/account-books（列表）
- [ ] GET /api/account-books/:id（详情）
- [ ] PUT /api/account-books/:id（编辑）
- [ ] DELETE /api/account-books/:id（删除）
- [ ] PUT /api/account-books/:id/set-default（设为默认）

**交易管理**:
- [ ] POST /api/transactions（创建交易）
- [ ] GET /api/transactions（列表，支持筛选）
- [ ] GET /api/transactions/:id（详情）
- [ ] PUT /api/transactions/:id（编辑）
- [ ] DELETE /api/transactions/:id（删除）

**标签管理**:
- [ ] POST /api/tags（创建标签）
- [ ] GET /api/tags（列表）
- [ ] GET /api/tags/available?accountBookId=&tagType=（可用标签）
- [ ] PUT /api/tags/:id（编辑）
- [ ] DELETE /api/tags/:id（删除）

**统计查询**:
- [ ] GET /api/statistics/monthly?accountBookId=&month=
- [ ] GET /api/statistics/category?accountBookId=&start=&end=
- [ ] GET /api/statistics/trend?accountBookId=&months=

---

### 阶段4: 前端界面 ✓

**账本管理**:
- [ ] 账本列表页面
- [ ] 创建账本表单
- [ ] 编辑账本表单
- [ ] 删除账本确认
- [ ] 账本切换器（顶部）

**交易管理**:
- [ ] 交易列表页面
- [ ] 创建交易表单
- [ ] 编辑交易表单
- [ ] 删除交易确认
- [ ] 交易搜索和筛选

**标签管理**:
- [ ] 标签列表页面
- [ ] 创建标签表单
- [ ] 编辑标签表单
- [ ] 删除标签确认

**统计分析**:
- [ ] 月度统计卡片
- [ ] 分类统计饼图
- [ ] 收支趋势折线图
- [ ] 账本切换后数据刷新

---

## 🚨 关键注意事项（血泪教训）

### 1. 余额计算的事务性

**错误做法**:
```java
// ❌ 先保存交易，再更新余额（可能导致不一致）
transactionRepository.save(transaction);
updateBalance(transaction);
```

**正确做法**:
```java
// ✅ 在同一事务中完成
@Transactional
public void createTransaction(Transaction transaction) {
    transactionRepository.save(transaction);
    updateBalance(transaction);
}
```

---

### 2. 默认账本的唯一性

**错误做法**:
```java
// ❌ 直接设置为默认，可能导致多个默认账本
book.setIsDefault(true);
save(book);
```

**正确做法**:
```java
// ✅ 先取消其他账本的默认状态
@Transactional
public void setDefault(Long id) {
    // 1. 取消当前默认
    AccountBook current = findByIsDefaultTrue();
    if (current != null) {
        current.setIsDefault(false);
        save(current);
    }

    // 2. 设置新默认
    AccountBook newDefault = findById(id);
    newDefault.setIsDefault(true);
    save(newDefault);
}
```

---

### 3. 标签作用域的验证

**错误做法**:
```java
// ❌ 不验证作用域，导致账本A使用账本B的专属标签
transaction.addTag(anyTag);
```

**正确做法**:
```java
// ✅ 验证标签是否可用于该账本
if (tag.getScope() == TagScope.ACCOUNT_BOOK) {
    if (!tag.getAccountBookId().equals(transaction.getAccountBookId())) {
        throw new BusinessException("该标签不可用于当前账本");
    }
}
transaction.addTag(tag);
```

---

### 4. 删除操作的级联处理

**错误做法**:
```java
// ❌ 直接删除账本，导致孤立的交易记录
accountBookRepository.delete(book);
```

**正确做法**:
```sql
-- ✅ 使用外键级联删除
FOREIGN KEY (account_book_id)
    REFERENCES account_book(id)
    ON DELETE CASCADE
```

---

## 📚 总结：V1核心要点

### 从业界学到的精华

1. ✅ **账本完全独立**（MoneyNote）
2. ✅ **双标签系统**（Firefly III）
3. ✅ **余额自动计算**（所有项目）
4. ✅ **统计单账本**（简化设计）
5. ✅ **交易必选分类**（数据质量）

### 我们的创新点

1. ✅ **类型只是标签**（不限制功能）
2. ✅ **全局+专属标签**（灵活性）
3. ✅ **极简设计**（降低门槛）
4. ✅ **手动记账**（用户完全控制）

### 开发优先级

**P0（必须完成）**:
- 账本管理（CRUD + 默认设置）
- 交易记录（CRUD + 余额更新）
- 标签系统（Category + Label）
- 基础统计（月度卡片 + 分类饼图）

**P1（可选完善）**:
- 趋势图（折线图）
- 交易搜索（按日期、标签筛选）
- 标签使用统计

---

**文档版本**: v1.0
**最后更新**: 2025-11-26
**下一步**: 开始编码实现
