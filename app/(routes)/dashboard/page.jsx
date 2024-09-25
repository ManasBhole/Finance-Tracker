import React from "react";
import { getAuth } from "@clerk/nextjs/server";
import CardInfo from "./_components/CardInfo";
import { db } from "@/utils/dbConfig";
import { desc, eq, getTableColumns, sql } from "drizzle-orm";
import { Budgets, Expenses, Incomes } from "@/utils/schema";
import BarChartDashboard from "./_components/BarChartDashboard";
import BudgetItem from "./budgets/_components/BudgetItem";
import ExpenseListTable from "./expenses/_components/ExpenseListTable";

export async function getServerSideProps(context) {
  // Fetch the authenticated user's session
  const { userId } = getAuth(context.req);

  if (!userId) {
    return {
      redirect: {
        destination: "/login", // Redirect to login if not authenticated
        permanent: false,
      },
    };
  }

  // Fetch budgets, incomes, and expenses data based on the user
  const budgetList = await db
    .select({
      ...getTableColumns(Budgets),
      totalSpend: sql`sum(${Expenses.amount})`.mapWith(Number),
      totalItem: sql`count(${Expenses.id})`.mapWith(Number),
    })
    .from(Budgets)
    .leftJoin(Expenses, eq(Budgets.id, Expenses.budgetId))
    .where(eq(Budgets.createdBy, userId))
    .groupBy(Budgets.id)
    .orderBy(desc(Budgets.id));

  const incomeList = await db
    .select({
      ...getTableColumns(Incomes),
      totalAmount: sql`SUM(CAST(${Incomes.amount} AS NUMERIC))`.mapWith(Number),
    })
    .from(Incomes)
    .groupBy(Incomes.id);

  const expensesList = await db
    .select({
      id: Expenses.id,
      name: Expenses.name,
      amount: Expenses.amount,
      createdAt: Expenses.createdAt,
    })
    .from(Budgets)
    .rightJoin(Expenses, eq(Budgets.id, Expenses.budgetId))
    .where(eq(Budgets.createdBy, userId))
    .orderBy(desc(Expenses.id));

  return {
    props: {
      budgetList,
      incomeList,
      expensesList,
    },
  };
}

function Dashboard({ budgetList, incomeList, expensesList }) {
  return (
    <div className="p-8 bg-">
      <h2 className="font-bold text-4xl">Hi, 👋</h2>
      <p className="text-gray-500">
        Here's what's happening with your money, Let's manage your expenses
      </p>

      <CardInfo budgetList={budgetList} incomeList={incomeList} />
      <div className="grid grid-cols-1 lg:grid-cols-3 mt-6 gap-5">
        <div className="lg:col-span-2">
          <BarChartDashboard budgetList={budgetList} />

          <ExpenseListTable
            expensesList={expensesList}
            refreshData={() => {} /* handle refreshing if needed */}
          />
        </div>
        <div className="grid gap-5">
          <h2 className="font-bold text-lg">Latest Budgets</h2>
          {budgetList?.length > 0
            ? budgetList.map((budget, index) => (
                <BudgetItem budget={budget} key={index} />
              ))
            : [1, 2, 3, 4].map((item, index) => (
                <div
                  key={index}
                  className="h-[180px] w-full
                 bg-slate-200 rounded-lg animate-pulse"
                ></div>
              ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
