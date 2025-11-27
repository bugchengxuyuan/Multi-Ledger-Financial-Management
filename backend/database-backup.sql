--
-- PostgreSQL database dump
--

\restrict vdXWcI2kBlQcqFqGUjnqcYYUDQNshniocBVTseS5tSJFg7Wwgv4YuDK77PCIxSl

-- Dumped from database version 16.11 (Homebrew)
-- Dumped by pg_dump version 16.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AccountBook; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."AccountBook" (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(10) NOT NULL,
    color character varying(20) NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "balanceMode" character varying(20) DEFAULT 'mixed'::character varying NOT NULL,
    "currentBalance" numeric(12,2) DEFAULT 0 NOT NULL,
    "initialBalance" numeric(12,2) DEFAULT 0 NOT NULL,
    config jsonb,
    features jsonb,
    type character varying(50) DEFAULT 'personal'::character varying NOT NULL
);


ALTER TABLE public."AccountBook" OWNER TO jianguo;

--
-- Name: BalanceLog; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."BalanceLog" (
    id text NOT NULL,
    "accountBookId" text NOT NULL,
    "changeType" character varying(20) NOT NULL,
    "amountBefore" numeric(12,2) NOT NULL,
    "amountAfter" numeric(12,2) NOT NULL,
    "changeAmount" numeric(12,2) NOT NULL,
    note text,
    "relatedIncomeId" text,
    "relatedExpenseId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "relatedTransactionId" text
);


ALTER TABLE public."BalanceLog" OWNER TO jianguo;

--
-- Name: Budget; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."Budget" (
    id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    period character varying(20) NOT NULL,
    "startDate" date NOT NULL,
    "accountBookId" text,
    "warningThreshold" integer DEFAULT 80 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryTagId" text NOT NULL
);


ALTER TABLE public."Budget" OWNER TO jianguo;

--
-- Name: Config; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."Config" (
    id text DEFAULT 'main'::text NOT NULL,
    "jiebeiTotal" numeric(10,2) NOT NULL,
    salary numeric(10,2) NOT NULL,
    "salaryDate" character varying(20) NOT NULL,
    "jiebeiDueDate" character varying(20) NOT NULL,
    "investmentCapital" numeric(12,2) NOT NULL,
    "currentAccountBookId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Config" OWNER TO jianguo;

--
-- Name: CreditAccount; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."CreditAccount" (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    provider character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    "currentDebt" numeric(12,2) DEFAULT 0 NOT NULL,
    "creditLimit" numeric(12,2),
    "repaymentDay" integer NOT NULL,
    "monthlyRepayment" numeric(12,2),
    status text DEFAULT 'active'::text NOT NULL,
    "accountBookId" text NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CreditAccount" OWNER TO jianguo;

--
-- Name: DebtChangeLog; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."DebtChangeLog" (
    id text NOT NULL,
    "creditAccountId" text NOT NULL,
    "changeType" text NOT NULL,
    "amountBefore" numeric(12,2) NOT NULL,
    "amountAfter" numeric(12,2) NOT NULL,
    "changeAmount" numeric(12,2) NOT NULL,
    note text,
    "relatedExpenseId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DebtChangeLog" OWNER TO jianguo;

--
-- Name: Expense; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."Expense" (
    id text NOT NULL,
    date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    description character varying(255) NOT NULL,
    "needsReimbursement" boolean DEFAULT false NOT NULL,
    "accountBookId" text,
    note text,
    "receiptPhoto" text,
    location text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryTagId" text NOT NULL,
    "labelTagIds" text[] NOT NULL
);


ALTER TABLE public."Expense" OWNER TO jianguo;

--
-- Name: ExpenseTemplate; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."ExpenseTemplate" (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    amount numeric(10,2) NOT NULL,
    description character varying(255) NOT NULL,
    "needsReimbursement" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryTagId" text NOT NULL,
    "labelTagIds" text[] NOT NULL
);


ALTER TABLE public."ExpenseTemplate" OWNER TO jianguo;

--
-- Name: Income; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."Income" (
    id text NOT NULL,
    date date NOT NULL,
    "categoryTagId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    description character varying(255) NOT NULL,
    "accountBookId" text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Income" OWNER TO jianguo;

--
-- Name: Investment; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."Investment" (
    id text NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'holding'::text NOT NULL,
    note text,
    "purchaseDate" date NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "accountBookId" text
);


ALTER TABLE public."Investment" OWNER TO jianguo;

--
-- Name: RecurringExpense; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."RecurringExpense" (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    amount numeric(10,2) NOT NULL,
    description character varying(255) NOT NULL,
    frequency character varying(20) NOT NULL,
    "dayOfWeek" integer,
    "dayOfMonth" integer,
    "monthOfYear" integer,
    "startDate" date NOT NULL,
    "endDate" date,
    "lastExecuted" timestamp(3) without time zone,
    enabled boolean DEFAULT true NOT NULL,
    "autoCreate" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryTagId" text NOT NULL
);


ALTER TABLE public."RecurringExpense" OWNER TO jianguo;

--
-- Name: Reimbursement; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."Reimbursement" (
    id text NOT NULL,
    date date NOT NULL,
    item character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    note text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "reimbursedDate" timestamp(3) without time zone,
    "expenseId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "transactionId" text
);


ALTER TABLE public."Reimbursement" OWNER TO jianguo;

--
-- Name: Tag; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."Tag" (
    id text NOT NULL,
    name character varying(50) NOT NULL,
    color character varying(20) NOT NULL,
    icon character varying(10),
    count integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    type character varying(20) NOT NULL,
    "accountBookId" text,
    "applicableTypes" text[] DEFAULT ARRAY[]::text[]
);


ALTER TABLE public."Tag" OWNER TO jianguo;

--
-- Name: Transaction; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public."Transaction" (
    id text NOT NULL,
    type character varying(20) NOT NULL,
    "subType" character varying(50),
    date date NOT NULL,
    "categoryTagId" text NOT NULL,
    amount numeric(12,2) NOT NULL,
    description character varying(255) NOT NULL,
    "accountBookId" text,
    note text,
    "needsReimbursement" boolean DEFAULT false NOT NULL,
    "labelTagIds" text[],
    "receiptPhoto" text,
    location text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Transaction" OWNER TO jianguo;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: jianguo
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO jianguo;

--
-- Data for Name: AccountBook; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."AccountBook" (id, name, description, icon, color, "isDefault", "createdAt", "updatedAt", "balanceMode", "currentBalance", "initialBalance", config, features, type) FROM stdin;
67ea7093-5c40-4357-b520-52f94b676616	个人账本	个人日常开销	💰	#4CAF50	t	2025-11-17 09:38:06.098	2025-11-21 10:42:35.197	mixed	5000.00	0.00	\N	\N	personal
80d7d540-3840-4953-99f8-c01219e59fac	Tiktok支出账本		📚	#3b82f6	f	2025-11-18 03:42:14.739	2025-11-22 03:50:34.186	mixed	20000.00	0.00	\N	\N	personal
\.


--
-- Data for Name: BalanceLog; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."BalanceLog" (id, "accountBookId", "changeType", "amountBefore", "amountAfter", "changeAmount", note, "relatedIncomeId", "relatedExpenseId", "createdAt", "relatedTransactionId") FROM stdin;
c83419d9-0850-48e8-aea5-a44127ccd64f	80d7d540-3840-4953-99f8-c01219e59fac	manual_adjust	0.00	20000.00	20000.00	手动调整余额	\N	\N	2025-11-22 03:50:34.19	\N
1d440464-8417-4136-97e2-14100b1ba7b0	67ea7093-5c40-4357-b520-52f94b676616	income	0.00	5000.00	5000.00	收入：月工资收入	1184a096-35cc-47f2-b0f7-f9f75397c306	\N	2025-11-21 10:42:35.198	1184a096-35cc-47f2-b0f7-f9f75397c306
\.


--
-- Data for Name: Budget; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."Budget" (id, amount, period, "startDate", "accountBookId", "warningThreshold", "createdAt", "updatedAt", "categoryTagId") FROM stdin;
\.


--
-- Data for Name: Config; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."Config" (id, "jiebeiTotal", salary, "salaryDate", "jiebeiDueDate", "investmentCapital", "currentAccountBookId", "createdAt", "updatedAt") FROM stdin;
main	0.00	0.00	每月1日	每月15日	0.00	67ea7093-5c40-4357-b520-52f94b676616	2025-11-17 09:49:26.031	2025-11-27 03:29:30.814
\.


--
-- Data for Name: CreditAccount; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."CreditAccount" (id, name, provider, type, "currentDebt", "creditLimit", "repaymentDay", "monthlyRepayment", status, "accountBookId", note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DebtChangeLog; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."DebtChangeLog" (id, "creditAccountId", "changeType", "amountBefore", "amountAfter", "changeAmount", note, "relatedExpenseId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Expense; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."Expense" (id, date, amount, description, "needsReimbursement", "accountBookId", note, "receiptPhoto", location, "createdAt", "updatedAt", "categoryTagId", "labelTagIds") FROM stdin;
0381e804-dcc8-47e7-a9a7-9cea30d6f1e5	2025-09-22	1389.00	iPhone 12pro美版	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 06:37:46.233	2025-11-20 06:37:46.233	bb1275a6-6222-4576-a3aa-f94e62c53d50	{}
929bac10-7200-4600-81ae-a02901bdb1dc	2025-10-16	285.89	DIMT香港服务器	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 08:30:54.365	2025-11-20 08:30:54.365	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	{}
6e60405e-8056-4adb-8c93-1816eaf60cd2	2025-11-18	285.11	DIMT香港服务器	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 08:34:33.589	2025-11-20 08:34:33.589	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	{}
b8bb33a1-e504-4c6f-9795-9160e3387fa4	2025-09-26	399.00	TikTok知识付费	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 09:43:10.163	2025-11-20 09:43:10.163	b8f5e119-e3e2-4a8f-a96c-12705e95b6d2	{}
8843baea-7a9e-4ad5-ba7c-6ce40175becb	2025-09-26	60.00	淘宝视频代做	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 09:44:35.39	2025-11-20 09:44:35.39	c39b5b8d-6cdb-4c8b-bfdc-bfb74d87ef7e	{}
ca4623f1-597d-481e-b077-b932777d42f4	2025-11-19	13.00	TikTok马来西亚废卡	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 09:45:36.144	2025-11-20 09:45:36.144	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	{}
9afb4a37-d6a2-4080-a79c-6c05f4cfdeab	2025-10-06	14.00	TikTok马来西亚废卡	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 09:46:23.668	2025-11-20 09:46:23.668	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	{}
1ebcbebc-880c-4dfb-a9aa-6dbc71267254	2025-10-29	32.00	与朋友外出吃饭	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.151	2025-11-18 01:33:56.151	20983413-ccb9-40ba-b276-a8185b5924e1	{}
1abf960e-6475-4d1a-8f37-c30cd1be8dc3	2025-09-21	57.24	马来西亚IP	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 08:51:15.311	2025-11-20 08:51:15.311	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	{}
3c965877-36c7-4c6a-9ced-19451cbf859b	2025-10-01	64.54	马来西亚IP	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 08:52:27.236	2025-11-20 08:52:27.236	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	{}
479361e7-64fc-4e53-86ff-5d8d5b6a78f9	2025-10-31	80.00	烧烤	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.164	2025-11-18 01:33:56.164	20983413-ccb9-40ba-b276-a8185b5924e1	{}
3a1aecdc-0a4f-44c2-9d23-bba7db83ca10	2025-11-03	20.00	锦合面店	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.172	2025-11-18 01:33:56.172	20983413-ccb9-40ba-b276-a8185b5924e1	{}
8fcdac62-0090-478b-a286-9fdf266dd24a	2025-11-08	15.00	老上海馄炖	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.182	2025-11-18 01:33:56.182	20983413-ccb9-40ba-b276-a8185b5924e1	{}
ba9ec11c-140c-47ff-a07c-ad63d3bd3a8d	2025-11-08	29.00	老山海馄炖	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.184	2025-11-18 01:33:56.184	20983413-ccb9-40ba-b276-a8185b5924e1	{}
de494171-dd38-4745-af25-056353eb20a4	2025-11-10	20.00	峡山酥面店	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.187	2025-11-18 01:33:56.187	20983413-ccb9-40ba-b276-a8185b5924e1	{}
14dc5bd1-f5c8-4bd5-99cd-cef4fe16686e	2025-11-15	20.00	峡山酥面店	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.196	2025-11-18 01:33:56.196	20983413-ccb9-40ba-b276-a8185b5924e1	{}
6e636df4-80df-45b1-a5db-d66d2d588607	2025-11-13	13.00	饿了么	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.203	2025-11-18 01:33:56.203	20983413-ccb9-40ba-b276-a8185b5924e1	{}
0c7d7a24-3ee5-4644-a73d-d6f5f8732c8b	2025-11-11	25.75	饿了么	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.206	2025-11-18 01:33:56.206	20983413-ccb9-40ba-b276-a8185b5924e1	{}
d9fd28f4-c22d-4875-a42c-43897d5fa0b7	2025-11-12	17.26	饿了么	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.209	2025-11-18 01:33:56.209	20983413-ccb9-40ba-b276-a8185b5924e1	{}
95959719-9189-4c1e-affd-2e1842dea774	2025-11-12	8.40	饿了么	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.211	2025-11-18 01:33:56.211	20983413-ccb9-40ba-b276-a8185b5924e1	{}
d39e38e3-3baf-4ebf-a15f-9803ffbd644d	2025-11-08	249.49	中国电信	t	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.201	2025-11-18 01:33:56.201	84a37723-c60d-4a3e-aac2-421ce72b9646	{}
a1100aff-a46c-47e4-96ac-ab68864d5155	2025-10-20	1231.45	花呗	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.144	2025-11-18 01:33:56.144	f5c662b0-f96e-48ba-b6fc-6e5441388d34	{}
adabd147-e44c-4b05-9f07-913086d59461	2025-11-08	86.03	美团月付	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.198	2025-11-18 01:33:56.198	f5c662b0-f96e-48ba-b6fc-6e5441388d34	{}
5cbab593-4f0d-4627-bd86-f74ed2ef95f4	2025-10-28	1153.61	白条	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.226	2025-11-18 01:33:56.226	f5c662b0-f96e-48ba-b6fc-6e5441388d34	{}
1d612576-9643-4b23-b0b7-00d0e5af939f	2025-11-01	8.00	运费	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.167	2025-11-18 01:33:56.167	ca6c1b30-18c7-40da-ba3a-d3f2074df07a	{}
a134451e-087f-4468-9ac2-f28f46e1d548	2025-10-24	25.00	虚拟充值	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.224	2025-11-18 01:33:56.224	c2dbd898-506f-4972-9a3d-9374560b7be5	{}
8dd8e5f0-94a7-498d-b65d-2b060f03dbba	2025-11-03	15.00	b站会员续费	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.169	2025-11-18 01:33:56.169	d141daba-23b5-4480-acfe-a95f49a3e4b3	{}
d4af0f79-79e6-4423-a229-4bcf9314a5b5	2025-11-03	28.00	QQ音乐续费	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.176	2025-11-18 01:33:56.176	d141daba-23b5-4480-acfe-a95f49a3e4b3	{}
9ae1a115-3be4-464a-9d62-1218c97ac783	2025-11-03	40.00	腾讯体育	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.179	2025-11-18 01:33:56.179	d141daba-23b5-4480-acfe-a95f49a3e4b3	{}
06c65553-10c8-452a-8278-624d321496ab	2025-11-10	6.00	王者荣耀曹操皮肤	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.19	2025-11-18 01:33:56.19	d141daba-23b5-4480-acfe-a95f49a3e4b3	{}
d57ac11f-d4b1-4793-a4a8-8c57a3a38251	2025-11-12	3.00	看东方1日会员	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.193	2025-11-18 01:33:56.193	d141daba-23b5-4480-acfe-a95f49a3e4b3	{}
f7df631b-8dc2-4659-9152-970ea7897e5f	2025-10-29	236.61	油费	t	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.148	2025-11-18 01:33:56.148	b2444a7a-74a1-405f-9fd2-967b734bf9af	{}
a6e35a2b-eda2-40b4-b8b8-a7168bdbe673	2025-10-30	8.00	豆浆	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.154	2025-11-18 01:33:56.154	b2444a7a-74a1-405f-9fd2-967b734bf9af	{}
d532a586-e69a-4e41-97fa-de723b1f1403	2025-10-30	30.00	剪头发	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.161	2025-11-18 01:33:56.161	b2444a7a-74a1-405f-9fd2-967b734bf9af	{}
09d35885-5bce-46a4-ad76-181ef1f06231	2025-10-21	10.00	饮食	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.214	2025-11-18 01:33:56.214	b2444a7a-74a1-405f-9fd2-967b734bf9af	{}
7d081c32-3739-45c4-bc51-6522b582a59f	2025-10-22	12.00	饮食	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.217	2025-11-18 01:33:56.217	b2444a7a-74a1-405f-9fd2-967b734bf9af	{}
5796c548-f3b3-49bf-a93a-21a3003b5a55	2025-10-27	20.00	饮食	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.219	2025-11-18 01:33:56.219	b2444a7a-74a1-405f-9fd2-967b734bf9af	{}
17f17fa3-a8eb-4482-9de9-616301e25f5b	2025-10-25	10.00	话费充值	f	67ea7093-5c40-4357-b520-52f94b676616	\N	\N	\N	2025-11-18 01:33:56.222	2025-11-18 01:33:56.222	b2444a7a-74a1-405f-9fd2-967b734bf9af	{}
f2e2a440-5fd5-41a7-a809-850684348cb0	2025-11-14	947.60	iPhone 11	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 08:06:50.192	2025-11-20 08:06:50.192	bb1275a6-6222-4576-a3aa-f94e62c53d50	{}
a0c83103-5a81-46c4-9600-bf4d8375497b	2025-09-11	39.20	荧光云服务器	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 09:02:58.449	2025-11-20 09:04:18.756	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	{}
fbe85668-4b4d-4e29-89e8-d2f23ad16c1d	2025-09-11	49.00	荧光云服务器	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 09:03:41.259	2025-11-20 09:04:32.741	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	{}
fe35fb6a-f57c-4fc6-89a5-111fc7cf5eb1	2025-10-16	16.83	荧光云服务器	t	80d7d540-3840-4953-99f8-c01219e59fac		\N	\N	2025-11-20 09:05:18.798	2025-11-20 09:05:18.798	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	{}
\.


--
-- Data for Name: ExpenseTemplate; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."ExpenseTemplate" (id, name, amount, description, "needsReimbursement", "createdAt", "updatedAt", "categoryTagId", "labelTagIds") FROM stdin;
\.


--
-- Data for Name: Income; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."Income" (id, date, "categoryTagId", amount, description, "accountBookId", note, "createdAt", "updatedAt") FROM stdin;
1184a096-35cc-47f2-b0f7-f9f75397c306	2025-11-21	d141daba-23b5-4480-acfe-a95f49a3e4b3	5000.00	月工资收入	67ea7093-5c40-4357-b520-52f94b676616	测试余额功能	2025-11-21 10:42:35.191	2025-11-21 10:42:35.191
\.


--
-- Data for Name: Investment; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."Investment" (id, name, type, amount, status, note, "purchaseDate", "createdAt", "updatedAt", "accountBookId") FROM stdin;
e35c091c-9a2a-4443-8251-f32e95c09d28	黄金ETF	贵金属	32201.10	holding	\N	2025-10-14	2025-11-18 01:33:56.238	2025-11-21 09:45:24.58	67ea7093-5c40-4357-b520-52f94b676616
82ab4aab-0cff-4edc-ab77-18bbbe15571a	国投瑞银白银期货(LOF)C	贵金属	2000.00	holding	\N	2025-10-20	2025-11-18 01:33:56.245	2025-11-21 09:45:24.58	67ea7093-5c40-4357-b520-52f94b676616
be04edee-ae64-4a90-bb59-d8ad32f4f8a9	恒生科技ETF	权益类	14996.60	holding	港股科技	2025-10-21	2025-11-18 01:33:56.246	2025-11-21 09:45:24.58	67ea7093-5c40-4357-b520-52f94b676616
3cfae85b-6fa1-47b9-b1b6-cbb87037d881	易方达安心回报债券A	固收类	13000.00	holding	债券基金	2025-10-20	2025-11-18 01:33:56.248	2025-11-21 09:45:24.58	67ea7093-5c40-4357-b520-52f94b676616
b42325db-81ca-4f11-be33-609d58bd44b2	工银瑞信增益中短债	固收类	7000.00	holding	短债基金	2025-10-20	2025-11-18 01:33:56.25	2025-11-21 09:45:24.58	67ea7093-5c40-4357-b520-52f94b676616
b0451790-aa8b-4ee8-a97a-696f37b7aef8	易方达天天理财货币A	固收类	10000.00	holding	货币基金	2025-10-20	2025-11-18 01:33:56.252	2025-11-21 09:45:24.58	67ea7093-5c40-4357-b520-52f94b676616
807c7f47-98f9-485f-8b65-8e0902faf305	上证转债	固收类	5001.80	holding	可转债	2025-10-21	2025-11-18 01:33:56.254	2025-11-21 09:45:24.58	67ea7093-5c40-4357-b520-52f94b676616
\.


--
-- Data for Name: RecurringExpense; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."RecurringExpense" (id, name, amount, description, frequency, "dayOfWeek", "dayOfMonth", "monthOfYear", "startDate", "endDate", "lastExecuted", enabled, "autoCreate", "createdAt", "updatedAt", "categoryTagId") FROM stdin;
\.


--
-- Data for Name: Reimbursement; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."Reimbursement" (id, date, item, amount, note, status, "reimbursedDate", "expenseId", "createdAt", "updatedAt", "transactionId") FROM stdin;
faa069d6-fa59-4e8e-a078-4e9f458245ef	2025-10-29	饮食	65.00	峡山面店	pending	\N	\N	2025-11-18 01:33:56.229	2025-11-18 01:33:56.229	\N
99c27096-f1e0-4c97-91b8-f3f76b75c335	2025-10-29	油费	236.61	生活必需支出	pending	\N	\N	2025-11-18 01:33:56.232	2025-11-18 01:33:56.232	\N
b55632af-d42a-4857-8778-20c35d1fcf25	2025-11-08	中国电信	249.49	通讯支出	pending	\N	\N	2025-11-18 01:33:56.234	2025-11-18 01:33:56.234	\N
46124c9d-7a4f-40fe-a994-3ba20e09b48b	2025-10-25	工作支出	8.00	顺丰速运	pending	\N	\N	2025-11-18 01:33:56.236	2025-11-18 01:33:56.236	\N
8fc2ad65-2655-4866-b55e-76f6db263f25	2025-09-22	iPhone 12pro美版	1389.00	工作设备支出	pending	\N	\N	2025-11-20 06:37:49.974	2025-11-20 06:50:22.805	\N
bc5f09aa-9404-45ee-bcf3-9eea7cb5d2f3	2025-09-22	iPhone 12pro美版	1389.00	工作设备支出	pending	\N	\N	2025-11-20 06:50:15.893	2025-11-20 06:50:25.083	\N
72eb5f17-1182-4d3d-b813-0114b4a0ea41	2025-09-22	iPhone 12pro美版	1389.00	工作设备支出	pending	\N	0381e804-dcc8-47e7-a9a7-9cea30d6f1e5	2025-11-20 06:37:46.264	2025-11-22 07:40:54.49	0381e804-dcc8-47e7-a9a7-9cea30d6f1e5
6d013414-6f7a-41b9-b7a0-4efeebad0771	2025-10-16	DIMT香港服务器	285.89	节点搭建支出	pending	\N	929bac10-7200-4600-81ae-a02901bdb1dc	2025-11-20 08:30:54.393	2025-11-22 07:40:54.491	929bac10-7200-4600-81ae-a02901bdb1dc
96137bb5-5e6d-44c6-b037-792f9562d9f9	2025-11-18	DIMT香港服务器	285.11	节点搭建支出	pending	\N	6e60405e-8056-4adb-8c93-1816eaf60cd2	2025-11-20 08:34:33.616	2025-11-22 07:40:54.492	6e60405e-8056-4adb-8c93-1816eaf60cd2
43b405fb-f08a-4341-a493-2b2c68cabb6e	2025-09-26	TikTok知识付费	399.00	知识付费支出	pending	\N	b8bb33a1-e504-4c6f-9795-9160e3387fa4	2025-11-20 09:43:10.2	2025-11-22 07:40:54.492	b8bb33a1-e504-4c6f-9795-9160e3387fa4
87ed7f22-36b0-41d5-9fec-a8ca52682c4e	2025-09-26	淘宝视频代做	60.00	视频制作支出	pending	\N	8843baea-7a9e-4ad5-ba7c-6ce40175becb	2025-11-20 09:44:35.418	2025-11-22 07:40:54.493	8843baea-7a9e-4ad5-ba7c-6ce40175becb
434f5768-ace0-4c32-a8f6-cb525fce96a3	2025-11-19	TikTok马来西亚废卡	13.00	节点搭建支出	pending	\N	ca4623f1-597d-481e-b077-b932777d42f4	2025-11-20 09:45:36.176	2025-11-22 07:40:54.494	ca4623f1-597d-481e-b077-b932777d42f4
d7b68e98-2f25-4948-b5d5-a03bee6bcb91	2025-10-06	TikTok马来西亚废卡	14.00	节点搭建支出	pending	\N	9afb4a37-d6a2-4080-a79c-6c05f4cfdeab	2025-11-20 09:46:23.701	2025-11-22 07:40:54.494	9afb4a37-d6a2-4080-a79c-6c05f4cfdeab
c31b5254-9c21-41f1-826e-b8c926980d2e	2025-09-21	马来西亚IP	57.24	节点搭建支出	pending	\N	1abf960e-6475-4d1a-8f37-c30cd1be8dc3	2025-11-20 08:51:15.366	2025-11-22 07:40:54.495	1abf960e-6475-4d1a-8f37-c30cd1be8dc3
75380b21-9568-402e-8c71-deb92dd7a5f5	2025-10-01	马来西亚IP	64.54	节点搭建支出	pending	\N	3c965877-36c7-4c6a-9ced-19451cbf859b	2025-11-20 08:52:27.268	2025-11-22 07:40:54.495	3c965877-36c7-4c6a-9ced-19451cbf859b
ad65db30-8131-4d12-99dd-0ab11aff5c11	2025-11-14	iPhone 11	947.60	工作设备支出	pending	\N	f2e2a440-5fd5-41a7-a809-850684348cb0	2025-11-20 08:06:50.248	2025-11-22 07:40:54.496	f2e2a440-5fd5-41a7-a809-850684348cb0
d1779629-a03e-4c5b-bed0-8d1c6cd70d65	2025-09-11	荧光云香港服务器	39.20	节点搭建支出	pending	\N	a0c83103-5a81-46c4-9600-bf4d8375497b	2025-11-20 09:02:58.494	2025-11-22 07:40:54.497	a0c83103-5a81-46c4-9600-bf4d8375497b
6b0d3428-e098-4487-8dfb-3056a6dad623	2025-09-11	荧光云香港服务器	49.00	节点搭建支出	pending	\N	fbe85668-4b4d-4e29-89e8-d2f23ad16c1d	2025-11-20 09:03:41.291	2025-11-22 07:40:54.498	fbe85668-4b4d-4e29-89e8-d2f23ad16c1d
08faa498-8185-4341-8160-b829a37b00b0	2025-10-16	荧光云服务器	16.83	节点搭建支出	pending	\N	fe35fb6a-f57c-4fc6-89a5-111fc7cf5eb1	2025-11-20 09:05:18.827	2025-11-22 07:40:54.498	fe35fb6a-f57c-4fc6-89a5-111fc7cf5eb1
\.


--
-- Data for Name: Tag; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."Tag" (id, name, color, icon, count, "createdAt", "updatedAt", type, "accountBookId", "applicableTypes") FROM stdin;
cfbee871-61c0-4c2a-a131-801320001fd3	其他投资	#8B5CF6	💰	0	2025-11-22 07:40:54.502	2025-11-23 10:18:37.298	category	\N	{investment}
5fbccec9-7aa1-4066-85ab-47d3257c9ed9	未报销	#F59E0B	receipt	13	2025-11-27 03:23:46.835	2025-11-27 03:26:49.65	label	\N	{expense}
b8f5e119-e3e2-4a8f-a96c-12705e95b6d2	知识付费	#f59e0b	\N	1	2025-11-20 09:10:24.442	2025-11-23 10:18:37.28	category	80d7d540-3840-4953-99f8-c01219e59fac	{expense}
c39b5b8d-6cdb-4c8b-bfdc-bfb74d87ef7e	视频制作	#ef4444	\N	1	2025-11-20 09:43:47.473	2025-11-23 10:18:37.284	category	80d7d540-3840-4953-99f8-c01219e59fac	{expense}
20983413-ccb9-40ba-b276-a8185b5924e1	饮食	#3b82f6	🏷️	11	2025-11-20 11:05:31.591	2025-11-23 10:18:37.286	category	67ea7093-5c40-4357-b520-52f94b676616	{expense}
84a37723-c60d-4a3e-aac2-421ce72b9646	通讯	#3b82f6	🏷️	1	2025-11-20 11:05:31.591	2025-11-23 10:18:37.288	category	67ea7093-5c40-4357-b520-52f94b676616	{expense}
ca6c1b30-18c7-40da-ba3a-d3f2074df07a	交通	#3b82f6	🏷️	1	2025-11-20 11:05:31.591	2025-11-23 10:18:37.289	category	67ea7093-5c40-4357-b520-52f94b676616	{expense}
c2dbd898-506f-4972-9a3d-9374560b7be5	娱乐消费	#3b82f6	🏷️	1	2025-11-20 11:05:31.591	2025-11-23 10:18:37.291	category	67ea7093-5c40-4357-b520-52f94b676616	{expense}
bb1275a6-6222-4576-a3aa-f94e62c53d50	工作设备	#3b82f6	🏷️	2	2025-11-20 06:34:45.981	2025-11-23 10:18:37.292	category	80d7d540-3840-4953-99f8-c01219e59fac	{expense}
f5c662b0-f96e-48ba-b6fc-6e5441388d34	信用还款	#3b82f6	🏷️	3	2025-11-20 11:05:31.591	2025-11-23 10:18:37.294	category	\N	{expense}
b2444a7a-74a1-405f-9fd2-967b734bf9af	生活必需	#3b82f6	💼	7	2025-11-20 11:05:31.591	2025-11-23 10:18:37.295	category	67ea7093-5c40-4357-b520-52f94b676616	{expense}
c3b87dc2-f59a-40ea-9ad7-5f4084d04315	节点搭建	#10b981	⭐	9	2025-11-20 08:09:42.062	2025-11-23 10:18:37.296	category	80d7d540-3840-4953-99f8-c01219e59fac	{expense}
d141daba-23b5-4480-acfe-a95f49a3e4b3	娱乐	#3b82f6	🎪	6	2025-11-20 11:05:31.591	2025-11-23 10:18:37.297	category	67ea7093-5c40-4357-b520-52f94b676616	{income,expense}
\.


--
-- Data for Name: Transaction; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public."Transaction" (id, type, "subType", date, "categoryTagId", amount, description, "accountBookId", note, "needsReimbursement", "labelTagIds", "receiptPhoto", location, metadata, "createdAt", "updatedAt") FROM stdin;
1184a096-35cc-47f2-b0f7-f9f75397c306	income	\N	2025-11-21	d141daba-23b5-4480-acfe-a95f49a3e4b3	5000.00	月工资收入	67ea7093-5c40-4357-b520-52f94b676616	测试余额功能	f	{}	\N	\N	\N	2025-11-21 10:42:35.191	2025-11-21 10:42:35.191
1ebcbebc-880c-4dfb-a9aa-6dbc71267254	expense	\N	2025-10-29	20983413-ccb9-40ba-b276-a8185b5924e1	32.00	与朋友外出吃饭	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.151	2025-11-18 01:33:56.151
479361e7-64fc-4e53-86ff-5d8d5b6a78f9	expense	\N	2025-10-31	20983413-ccb9-40ba-b276-a8185b5924e1	80.00	烧烤	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.164	2025-11-18 01:33:56.164
3a1aecdc-0a4f-44c2-9d23-bba7db83ca10	expense	\N	2025-11-03	20983413-ccb9-40ba-b276-a8185b5924e1	20.00	锦合面店	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.172	2025-11-18 01:33:56.172
8fcdac62-0090-478b-a286-9fdf266dd24a	expense	\N	2025-11-08	20983413-ccb9-40ba-b276-a8185b5924e1	15.00	老上海馄炖	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.182	2025-11-18 01:33:56.182
ba9ec11c-140c-47ff-a07c-ad63d3bd3a8d	expense	\N	2025-11-08	20983413-ccb9-40ba-b276-a8185b5924e1	29.00	老山海馄炖	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.184	2025-11-18 01:33:56.184
de494171-dd38-4745-af25-056353eb20a4	expense	\N	2025-11-10	20983413-ccb9-40ba-b276-a8185b5924e1	20.00	峡山酥面店	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.187	2025-11-18 01:33:56.187
14dc5bd1-f5c8-4bd5-99cd-cef4fe16686e	expense	\N	2025-11-15	20983413-ccb9-40ba-b276-a8185b5924e1	20.00	峡山酥面店	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.196	2025-11-18 01:33:56.196
6e636df4-80df-45b1-a5db-d66d2d588607	expense	\N	2025-11-13	20983413-ccb9-40ba-b276-a8185b5924e1	13.00	饿了么	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.203	2025-11-18 01:33:56.203
0c7d7a24-3ee5-4644-a73d-d6f5f8732c8b	expense	\N	2025-11-11	20983413-ccb9-40ba-b276-a8185b5924e1	25.75	饿了么	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.206	2025-11-18 01:33:56.206
d9fd28f4-c22d-4875-a42c-43897d5fa0b7	expense	\N	2025-11-12	20983413-ccb9-40ba-b276-a8185b5924e1	17.26	饿了么	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.209	2025-11-18 01:33:56.209
95959719-9189-4c1e-affd-2e1842dea774	expense	\N	2025-11-12	20983413-ccb9-40ba-b276-a8185b5924e1	8.40	饿了么	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.211	2025-11-18 01:33:56.211
d39e38e3-3baf-4ebf-a15f-9803ffbd644d	expense	\N	2025-11-08	84a37723-c60d-4a3e-aac2-421ce72b9646	249.49	中国电信	67ea7093-5c40-4357-b520-52f94b676616	\N	t	{}	\N	\N	\N	2025-11-18 01:33:56.201	2025-11-18 01:33:56.201
a1100aff-a46c-47e4-96ac-ab68864d5155	expense	\N	2025-10-20	f5c662b0-f96e-48ba-b6fc-6e5441388d34	1231.45	花呗	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.144	2025-11-18 01:33:56.144
adabd147-e44c-4b05-9f07-913086d59461	expense	\N	2025-11-08	f5c662b0-f96e-48ba-b6fc-6e5441388d34	86.03	美团月付	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.198	2025-11-18 01:33:56.198
5cbab593-4f0d-4627-bd86-f74ed2ef95f4	expense	\N	2025-10-28	f5c662b0-f96e-48ba-b6fc-6e5441388d34	1153.61	白条	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.226	2025-11-18 01:33:56.226
1d612576-9643-4b23-b0b7-00d0e5af939f	expense	\N	2025-11-01	ca6c1b30-18c7-40da-ba3a-d3f2074df07a	8.00	运费	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.167	2025-11-18 01:33:56.167
a134451e-087f-4468-9ac2-f28f46e1d548	expense	\N	2025-10-24	c2dbd898-506f-4972-9a3d-9374560b7be5	25.00	虚拟充值	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.224	2025-11-18 01:33:56.224
8dd8e5f0-94a7-498d-b65d-2b060f03dbba	expense	\N	2025-11-03	d141daba-23b5-4480-acfe-a95f49a3e4b3	15.00	b站会员续费	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.169	2025-11-18 01:33:56.169
d4af0f79-79e6-4423-a229-4bcf9314a5b5	expense	\N	2025-11-03	d141daba-23b5-4480-acfe-a95f49a3e4b3	28.00	QQ音乐续费	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.176	2025-11-18 01:33:56.176
9ae1a115-3be4-464a-9d62-1218c97ac783	expense	\N	2025-11-03	d141daba-23b5-4480-acfe-a95f49a3e4b3	40.00	腾讯体育	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.179	2025-11-18 01:33:56.179
06c65553-10c8-452a-8278-624d321496ab	expense	\N	2025-11-10	d141daba-23b5-4480-acfe-a95f49a3e4b3	6.00	王者荣耀曹操皮肤	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.19	2025-11-18 01:33:56.19
d57ac11f-d4b1-4793-a4a8-8c57a3a38251	expense	\N	2025-11-12	d141daba-23b5-4480-acfe-a95f49a3e4b3	3.00	看东方1日会员	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.193	2025-11-18 01:33:56.193
f7df631b-8dc2-4659-9152-970ea7897e5f	expense	\N	2025-10-29	b2444a7a-74a1-405f-9fd2-967b734bf9af	236.61	油费	67ea7093-5c40-4357-b520-52f94b676616	\N	t	{}	\N	\N	\N	2025-11-18 01:33:56.148	2025-11-18 01:33:56.148
a6e35a2b-eda2-40b4-b8b8-a7168bdbe673	expense	\N	2025-10-30	b2444a7a-74a1-405f-9fd2-967b734bf9af	8.00	豆浆	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.154	2025-11-18 01:33:56.154
d532a586-e69a-4e41-97fa-de723b1f1403	expense	\N	2025-10-30	b2444a7a-74a1-405f-9fd2-967b734bf9af	30.00	剪头发	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.161	2025-11-18 01:33:56.161
09d35885-5bce-46a4-ad76-181ef1f06231	expense	\N	2025-10-21	b2444a7a-74a1-405f-9fd2-967b734bf9af	10.00	饮食	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.214	2025-11-18 01:33:56.214
7d081c32-3739-45c4-bc51-6522b582a59f	expense	\N	2025-10-22	b2444a7a-74a1-405f-9fd2-967b734bf9af	12.00	饮食	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.217	2025-11-18 01:33:56.217
929bac10-7200-4600-81ae-a02901bdb1dc	expense	\N	2025-10-16	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	285.89	DIMT香港服务器	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 08:30:54.365	2025-11-27 03:26:49.639
6e60405e-8056-4adb-8c93-1816eaf60cd2	expense	\N	2025-11-18	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	285.11	DIMT香港服务器	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 08:34:33.589	2025-11-27 03:26:49.64
b8bb33a1-e504-4c6f-9795-9160e3387fa4	expense	\N	2025-09-26	b8f5e119-e3e2-4a8f-a96c-12705e95b6d2	399.00	TikTok知识付费	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 09:43:10.163	2025-11-27 03:26:49.641
ca4623f1-597d-481e-b077-b932777d42f4	expense	\N	2025-11-19	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	13.00	TikTok马来西亚废卡	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 09:45:36.144	2025-11-27 03:26:49.644
9afb4a37-d6a2-4080-a79c-6c05f4cfdeab	expense	\N	2025-10-06	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	14.00	TikTok马来西亚废卡	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 09:46:23.668	2025-11-27 03:26:49.645
1abf960e-6475-4d1a-8f37-c30cd1be8dc3	expense	\N	2025-09-21	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	57.24	马来西亚IP	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 08:51:15.311	2025-11-27 03:26:49.645
3c965877-36c7-4c6a-9ced-19451cbf859b	expense	\N	2025-10-01	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	64.54	马来西亚IP	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 08:52:27.236	2025-11-27 03:26:49.646
5796c548-f3b3-49bf-a93a-21a3003b5a55	expense	\N	2025-10-27	b2444a7a-74a1-405f-9fd2-967b734bf9af	20.00	饮食	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.219	2025-11-18 01:33:56.219
17f17fa3-a8eb-4482-9de9-616301e25f5b	expense	\N	2025-10-25	b2444a7a-74a1-405f-9fd2-967b734bf9af	10.00	话费充值	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	\N	2025-11-18 01:33:56.222	2025-11-18 01:33:56.222
317b4d71-90ed-441d-b83b-1de6d43ecd11	investment	buy	2025-10-14	cfbee871-61c0-4c2a-a131-801320001fd3	32201.10	黄金ETF	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	{"originalId": "e35c091c-9a2a-4443-8251-f32e95c09d28", "originalType": "贵金属", "originalStatus": "holding"}	2025-11-18 01:33:56.238	2025-11-21 09:45:24.58
868082ba-48f3-4919-b800-5a6f7eb601d1	investment	buy	2025-10-20	cfbee871-61c0-4c2a-a131-801320001fd3	2000.00	国投瑞银白银期货(LOF)C	67ea7093-5c40-4357-b520-52f94b676616	\N	f	{}	\N	\N	{"originalId": "82ab4aab-0cff-4edc-ab77-18bbbe15571a", "originalType": "贵金属", "originalStatus": "holding"}	2025-11-18 01:33:56.245	2025-11-21 09:45:24.58
8597d420-3460-4b8f-8ee5-5d1279315a0c	investment	buy	2025-10-21	cfbee871-61c0-4c2a-a131-801320001fd3	14996.60	恒生科技ETF	67ea7093-5c40-4357-b520-52f94b676616	港股科技	f	{}	\N	\N	{"originalId": "be04edee-ae64-4a90-bb59-d8ad32f4f8a9", "originalType": "权益类", "originalStatus": "holding"}	2025-11-18 01:33:56.246	2025-11-21 09:45:24.58
36accfcf-ec0c-4c75-a17d-3f35fcf03847	investment	buy	2025-10-20	cfbee871-61c0-4c2a-a131-801320001fd3	13000.00	易方达安心回报债券A	67ea7093-5c40-4357-b520-52f94b676616	债券基金	f	{}	\N	\N	{"originalId": "3cfae85b-6fa1-47b9-b1b6-cbb87037d881", "originalType": "固收类", "originalStatus": "holding"}	2025-11-18 01:33:56.248	2025-11-21 09:45:24.58
4e90c240-e0e4-48f8-8f90-a1fdef8567af	investment	buy	2025-10-20	cfbee871-61c0-4c2a-a131-801320001fd3	7000.00	工银瑞信增益中短债	67ea7093-5c40-4357-b520-52f94b676616	短债基金	f	{}	\N	\N	{"originalId": "b42325db-81ca-4f11-be33-609d58bd44b2", "originalType": "固收类", "originalStatus": "holding"}	2025-11-18 01:33:56.25	2025-11-21 09:45:24.58
f061e06d-9412-467b-b628-3b87acda64e1	investment	buy	2025-10-20	cfbee871-61c0-4c2a-a131-801320001fd3	10000.00	易方达天天理财货币A	67ea7093-5c40-4357-b520-52f94b676616	货币基金	f	{}	\N	\N	{"originalId": "b0451790-aa8b-4ee8-a97a-696f37b7aef8", "originalType": "固收类", "originalStatus": "holding"}	2025-11-18 01:33:56.252	2025-11-21 09:45:24.58
f8c834f1-d8ac-402a-ac34-a3022998845a	investment	buy	2025-10-21	cfbee871-61c0-4c2a-a131-801320001fd3	5001.80	上证转债	67ea7093-5c40-4357-b520-52f94b676616	可转债	f	{}	\N	\N	{"originalId": "807c7f47-98f9-485f-8b65-8e0902faf305", "originalType": "固收类", "originalStatus": "holding"}	2025-11-18 01:33:56.254	2025-11-21 09:45:24.58
a0c83103-5a81-46c4-9600-bf4d8375497b	expense	\N	2025-09-11	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	39.20	荧光云服务器	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 09:02:58.449	2025-11-27 03:26:49.647
fbe85668-4b4d-4e29-89e8-d2f23ad16c1d	expense	\N	2025-09-11	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	49.00	荧光云服务器	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 09:03:41.259	2025-11-27 03:26:49.648
fe35fb6a-f57c-4fc6-89a5-111fc7cf5eb1	expense	\N	2025-10-16	c3b87dc2-f59a-40ea-9ad7-5f4084d04315	16.83	荧光云服务器	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 09:05:18.798	2025-11-27 03:26:49.649
0381e804-dcc8-47e7-a9a7-9cea30d6f1e5	expense	\N	2025-09-22	bb1275a6-6222-4576-a3aa-f94e62c53d50	1389.00	iPhone 12pro美版	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 06:37:46.233	2025-11-27 03:26:49.635
8843baea-7a9e-4ad5-ba7c-6ce40175becb	expense	\N	2025-09-26	c39b5b8d-6cdb-4c8b-bfdc-bfb74d87ef7e	60.00	淘宝视频代做	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 09:44:35.39	2025-11-27 03:26:49.642
f2e2a440-5fd5-41a7-a809-850684348cb0	expense	\N	2025-11-14	bb1275a6-6222-4576-a3aa-f94e62c53d50	947.60	iPhone 11	80d7d540-3840-4953-99f8-c01219e59fac		t	{5fbccec9-7aa1-4066-85ab-47d3257c9ed9}	\N	\N	\N	2025-11-20 08:06:50.192	2025-11-27 03:26:49.647
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: jianguo
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
bfa0623b-5a2b-41e2-a6a5-e96e9f58ad71	0c12e68bbb81a094cc0a785b1f042f9ce9aa6630471ffab1dd9041b17c4e2299	2025-11-17 17:25:45.563842+08	20251117092545_init	\N	\N	2025-11-17 17:25:45.555911+08	1
34fe21bf-7b48-4479-bb52-61f31da8ee15	b9bcd77ebcec55b8289762eb9ce2fd9a671cacf0b46479d1a602442c1a7d4c7f	2025-11-18 16:55:05.598283+08	20251118085505_add_credit_accounts	\N	\N	2025-11-18 16:55:05.594353+08	1
1dc4b7eb-9325-4c3c-9bc0-b25493af8e59	bff8d7a560066a552393b2fd6a74b7002bbbaefe19c05807e349e84f305b8c38	2025-11-20 11:05:16.637779+08	20251120104518_unified_tag_system		\N	2025-11-20 11:05:16.637779+08	0
c6816580-f606-4178-836a-c3c4a9fb5442	7dd2abca2964e47e2d471b0edf1eb7c58fdb7e96a2e95da05b7559f1d6d83f6e	2025-11-21 17:43:39.168665+08	20251121094339_add_accountbook_to_investment	\N	\N	2025-11-21 17:43:39.16665+08	1
1c67b7b1-bd27-4741-baeb-66056e6d6f99	acde2febf091100313fde13b375b9a8fd8f4e52195871ce1415e79ab04395e75	2025-11-21 18:38:10.028904+08	20251121103810_add_balance_management	\N	\N	2025-11-21 18:38:10.022524+08	1
\.


--
-- Name: AccountBook AccountBook_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."AccountBook"
    ADD CONSTRAINT "AccountBook_pkey" PRIMARY KEY (id);


--
-- Name: BalanceLog BalanceLog_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."BalanceLog"
    ADD CONSTRAINT "BalanceLog_pkey" PRIMARY KEY (id);


--
-- Name: Budget Budget_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_pkey" PRIMARY KEY (id);


--
-- Name: Config Config_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Config"
    ADD CONSTRAINT "Config_pkey" PRIMARY KEY (id);


--
-- Name: CreditAccount CreditAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."CreditAccount"
    ADD CONSTRAINT "CreditAccount_pkey" PRIMARY KEY (id);


--
-- Name: DebtChangeLog DebtChangeLog_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."DebtChangeLog"
    ADD CONSTRAINT "DebtChangeLog_pkey" PRIMARY KEY (id);


--
-- Name: ExpenseTemplate ExpenseTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."ExpenseTemplate"
    ADD CONSTRAINT "ExpenseTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Expense Expense_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY (id);


--
-- Name: Income Income_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Income"
    ADD CONSTRAINT "Income_pkey" PRIMARY KEY (id);


--
-- Name: Investment Investment_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Investment"
    ADD CONSTRAINT "Investment_pkey" PRIMARY KEY (id);


--
-- Name: RecurringExpense RecurringExpense_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."RecurringExpense"
    ADD CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY (id);


--
-- Name: Reimbursement Reimbursement_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Reimbursement"
    ADD CONSTRAINT "Reimbursement_pkey" PRIMARY KEY (id);


--
-- Name: Tag Tag_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_pkey" PRIMARY KEY (id);


--
-- Name: Transaction Transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AccountBook_isDefault_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "AccountBook_isDefault_idx" ON public."AccountBook" USING btree ("isDefault");


--
-- Name: BalanceLog_accountBookId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "BalanceLog_accountBookId_idx" ON public."BalanceLog" USING btree ("accountBookId");


--
-- Name: BalanceLog_changeType_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "BalanceLog_changeType_idx" ON public."BalanceLog" USING btree ("changeType");


--
-- Name: BalanceLog_createdAt_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "BalanceLog_createdAt_idx" ON public."BalanceLog" USING btree ("createdAt");


--
-- Name: BalanceLog_relatedTransactionId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "BalanceLog_relatedTransactionId_idx" ON public."BalanceLog" USING btree ("relatedTransactionId");


--
-- Name: Budget_categoryTagId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Budget_categoryTagId_idx" ON public."Budget" USING btree ("categoryTagId");


--
-- Name: Budget_period_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Budget_period_idx" ON public."Budget" USING btree (period);


--
-- Name: CreditAccount_accountBookId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "CreditAccount_accountBookId_idx" ON public."CreditAccount" USING btree ("accountBookId");


--
-- Name: CreditAccount_status_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "CreditAccount_status_idx" ON public."CreditAccount" USING btree (status);


--
-- Name: CreditAccount_type_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "CreditAccount_type_idx" ON public."CreditAccount" USING btree (type);


--
-- Name: DebtChangeLog_changeType_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "DebtChangeLog_changeType_idx" ON public."DebtChangeLog" USING btree ("changeType");


--
-- Name: DebtChangeLog_createdAt_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "DebtChangeLog_createdAt_idx" ON public."DebtChangeLog" USING btree ("createdAt");


--
-- Name: DebtChangeLog_creditAccountId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "DebtChangeLog_creditAccountId_idx" ON public."DebtChangeLog" USING btree ("creditAccountId");


--
-- Name: ExpenseTemplate_categoryTagId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "ExpenseTemplate_categoryTagId_idx" ON public."ExpenseTemplate" USING btree ("categoryTagId");


--
-- Name: Expense_accountBookId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Expense_accountBookId_idx" ON public."Expense" USING btree ("accountBookId");


--
-- Name: Expense_categoryTagId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Expense_categoryTagId_idx" ON public."Expense" USING btree ("categoryTagId");


--
-- Name: Expense_date_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Expense_date_idx" ON public."Expense" USING btree (date);


--
-- Name: Income_accountBookId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Income_accountBookId_idx" ON public."Income" USING btree ("accountBookId");


--
-- Name: Income_categoryTagId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Income_categoryTagId_idx" ON public."Income" USING btree ("categoryTagId");


--
-- Name: Income_date_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Income_date_idx" ON public."Income" USING btree (date);


--
-- Name: Investment_accountBookId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Investment_accountBookId_idx" ON public."Investment" USING btree ("accountBookId");


--
-- Name: Investment_status_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Investment_status_idx" ON public."Investment" USING btree (status);


--
-- Name: Investment_type_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Investment_type_idx" ON public."Investment" USING btree (type);


--
-- Name: RecurringExpense_categoryTagId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "RecurringExpense_categoryTagId_idx" ON public."RecurringExpense" USING btree ("categoryTagId");


--
-- Name: RecurringExpense_enabled_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "RecurringExpense_enabled_idx" ON public."RecurringExpense" USING btree (enabled);


--
-- Name: Reimbursement_expenseId_key; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE UNIQUE INDEX "Reimbursement_expenseId_key" ON public."Reimbursement" USING btree ("expenseId");


--
-- Name: Reimbursement_status_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Reimbursement_status_idx" ON public."Reimbursement" USING btree (status);


--
-- Name: Reimbursement_transactionId_key; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE UNIQUE INDEX "Reimbursement_transactionId_key" ON public."Reimbursement" USING btree ("transactionId");


--
-- Name: Tag_accountBookId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Tag_accountBookId_idx" ON public."Tag" USING btree ("accountBookId");


--
-- Name: Tag_name_key; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE UNIQUE INDEX "Tag_name_key" ON public."Tag" USING btree (name);


--
-- Name: Tag_type_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Tag_type_idx" ON public."Tag" USING btree (type);


--
-- Name: Transaction_accountBookId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Transaction_accountBookId_idx" ON public."Transaction" USING btree ("accountBookId");


--
-- Name: Transaction_categoryTagId_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Transaction_categoryTagId_idx" ON public."Transaction" USING btree ("categoryTagId");


--
-- Name: Transaction_date_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Transaction_date_idx" ON public."Transaction" USING btree (date);


--
-- Name: Transaction_type_idx; Type: INDEX; Schema: public; Owner: jianguo
--

CREATE INDEX "Transaction_type_idx" ON public."Transaction" USING btree (type);


--
-- Name: BalanceLog BalanceLog_accountBookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."BalanceLog"
    ADD CONSTRAINT "BalanceLog_accountBookId_fkey" FOREIGN KEY ("accountBookId") REFERENCES public."AccountBook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BalanceLog BalanceLog_relatedTransactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."BalanceLog"
    ADD CONSTRAINT "BalanceLog_relatedTransactionId_fkey" FOREIGN KEY ("relatedTransactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Budget Budget_accountBookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_accountBookId_fkey" FOREIGN KEY ("accountBookId") REFERENCES public."AccountBook"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Budget Budget_categoryTagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Budget"
    ADD CONSTRAINT "Budget_categoryTagId_fkey" FOREIGN KEY ("categoryTagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CreditAccount CreditAccount_accountBookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."CreditAccount"
    ADD CONSTRAINT "CreditAccount_accountBookId_fkey" FOREIGN KEY ("accountBookId") REFERENCES public."AccountBook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DebtChangeLog DebtChangeLog_creditAccountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."DebtChangeLog"
    ADD CONSTRAINT "DebtChangeLog_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES public."CreditAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExpenseTemplate ExpenseTemplate_categoryTagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."ExpenseTemplate"
    ADD CONSTRAINT "ExpenseTemplate_categoryTagId_fkey" FOREIGN KEY ("categoryTagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Expense Expense_accountBookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_accountBookId_fkey" FOREIGN KEY ("accountBookId") REFERENCES public."AccountBook"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Expense Expense_categoryTagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_categoryTagId_fkey" FOREIGN KEY ("categoryTagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Income Income_accountBookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Income"
    ADD CONSTRAINT "Income_accountBookId_fkey" FOREIGN KEY ("accountBookId") REFERENCES public."AccountBook"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Income Income_categoryTagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Income"
    ADD CONSTRAINT "Income_categoryTagId_fkey" FOREIGN KEY ("categoryTagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Investment Investment_accountBookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Investment"
    ADD CONSTRAINT "Investment_accountBookId_fkey" FOREIGN KEY ("accountBookId") REFERENCES public."AccountBook"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecurringExpense RecurringExpense_categoryTagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."RecurringExpense"
    ADD CONSTRAINT "RecurringExpense_categoryTagId_fkey" FOREIGN KEY ("categoryTagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reimbursement Reimbursement_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Reimbursement"
    ADD CONSTRAINT "Reimbursement_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public."Expense"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reimbursement Reimbursement_transactionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Reimbursement"
    ADD CONSTRAINT "Reimbursement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES public."Transaction"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Tag Tag_accountBookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_accountBookId_fkey" FOREIGN KEY ("accountBookId") REFERENCES public."AccountBook"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_accountBookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_accountBookId_fkey" FOREIGN KEY ("accountBookId") REFERENCES public."AccountBook"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_categoryTagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jianguo
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_categoryTagId_fkey" FOREIGN KEY ("categoryTagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict vdXWcI2kBlQcqFqGUjnqcYYUDQNshniocBVTseS5tSJFg7Wwgv4YuDK77PCIxSl

