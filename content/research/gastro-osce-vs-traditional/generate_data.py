import pandas as pd
import numpy as np

# 设置随机种子以保证结果可复现
np.random.seed(42)

# 生成80名学员的模拟数据
n_students = 80
student_ids = [f'S{str(i).zfill(3)}' for i in range(1, n_students + 1)]

# 1. 基本信息
genders = np.random.choice([1, 2], size=n_students, p=[0.4, 0.6]) # 假设女性稍多
years = np.random.choice([1, 2, 3], size=n_students, p=[0.4, 0.3, 0.3])

# 2. 传统考核成绩 (均值75, SD=8)
# 理论分 (稍微偏高, 均值78)
score_trad_theory = np.random.normal(78, 8, n_students).clip(0, 100)
# 技能分 (稍微偏低, 均值72)
score_trad_skill = np.random.normal(72, 10, n_students).clip(0, 100)
# 计算传统总分
score_trad_total = score_trad_theory * 0.4 + score_trad_skill * 0.6

# 3. OSCE考核成绩 (与传统成绩存在中等相关性, r~0.5)
# 基于传统成绩生成OSCE成绩，加入随机扰动
noise = np.random.normal(0, 8, n_students)
score_osce_base = 0.5 * score_trad_total + 40 + noise # 基础分，均值约77.5

# 生成各站点分数 (围绕基础分波动)
score_osce_st1 = (score_osce_base + np.random.normal(2, 5, n_students)).clip(0, 100) # 病史采集
score_osce_st2 = (score_osce_base + np.random.normal(-2, 5, n_students)).clip(0, 100) # 体格检查
score_osce_st3 = (score_osce_base + np.random.normal(0, 6, n_students)).clip(0, 100) # 技能操作
score_osce_st4 = (score_osce_base + np.random.normal(1, 5, n_students)).clip(0, 100) # 病例分析

# 计算OSCE总分
score_osce_total = (score_osce_st1 + score_osce_st2 + score_osce_st3 + score_osce_st4) / 4

# 4. 胜任力维度 (OSCE组通常在沟通和思维上得分更高)
# 传统考核下的胜任力评估 (假设评分较低)
comp_think_trad = np.random.normal(6.5, 1.2, n_students).clip(1, 10)
comp_comm_trad = np.random.normal(6.8, 1.1, n_students).clip(1, 10)

# OSCE考核下的胜任力评估 (假设评分较高)
comp_think_osce = np.random.normal(7.8, 1.0, n_students).clip(1, 10)
comp_comm_osce = np.random.normal(8.2, 0.9, n_students).clip(1, 10)

# 5. 满意度 (1-5分)
# 假设学员更认可OSCE对能力的提升 (均值4.2 vs 3.5)
sat_osce = np.random.normal(4.2, 0.7, n_students).clip(1, 5).round()
sat_trad = np.random.normal(3.5, 0.8, n_students).clip(1, 5).round()

# 构建DataFrame
df = pd.DataFrame({
    'Student_ID': student_ids,
    'Gender': genders,
    'Year': years,
    'Score_Trad_Theory': score_trad_theory.round(1),
    'Score_Trad_Skill': score_trad_skill.round(1),
    'Score_Trad_Total': score_trad_total.round(1),
    'Score_OSCE_St1': score_osce_st1.round(1),
    'Score_OSCE_St2': score_osce_st2.round(1),
    'Score_OSCE_St3': score_osce_st3.round(1),
    'Score_OSCE_St4': score_osce_st4.round(1),
    'Score_OSCE_Total': score_osce_total.round(1),
    'Comp_Think_Trad': comp_think_trad.round(1),
    'Comp_Comm_Trad': comp_comm_trad.round(1),
    'Comp_Think_OSCE': comp_think_osce.round(1),
    'Comp_Comm_OSCE': comp_comm_osce.round(1),
    'Sat_OSCE': sat_osce,
    'Sat_Trad': sat_trad
})

# 保存为CSV
output_path = r'c:\Users\Mart\Documents\hugo\content\research\gastro-osce-vs-traditional\data_simulation.csv'
df.to_csv(output_path, index=False, encoding='utf-8-sig')
print(f"模拟数据已生成: {output_path}")
