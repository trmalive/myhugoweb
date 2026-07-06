export const PLANS = [
  {
    id: 'single',
    name: '单篇审稿',
    price: 200,
    priceLabel: '¥200',
    description: '多次审稿直到接收',
    features: ['多次审稿，满意为止', '一次仅可上传 1 篇', '文字回复 + 批注文件'],
    concurrent: 1,
  },
  {
    id: '3month',
    name: '3个月包月',
    price: 180,
    priceLabel: '¥180 / 3个月',
    description: '平均 ¥60/月',
    features: ['3 个月内无限次上传', '一次仅可上传 1 篇', '文字回复 + 批注文件'],
    concurrent: 1,
    badge: '热门',
  },
  {
    id: '6month',
    name: '6个月包月',
    price: 300,
    priceLabel: '¥300 / 6个月',
    description: '平均 ¥50/月，省 ¥60',
    features: ['6 个月内无限次上传', '一次仅可上传 1 篇', '文字回复 + 批注文件'],
    concurrent: 1,
    badge: '推荐',
  },
  {
    id: '12month',
    name: '12个月包年',
    price: 550,
    priceLabel: '¥550 / 年',
    description: '平均 ¥45.8/月，省 ¥170',
    features: ['一年内无限次上传', '同时可上传 2 篇', '文字回复 + 批注文件'],
    concurrent: 2,
    badge: '最划算',
  },
]

export function getPlan(id) {
  return PLANS.find(p => p.id === id)
}
