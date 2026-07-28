import os

input_path = '/Users/notme/Desktop/SURESTRIKETIPS/frontend/app/admin/page.tsx'
output_path = '/Users/notme/Desktop/Kaana Predictions/frontend/app/admin/page.tsx'

with open(input_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ('Sure<span style={{ color: "#c9a84c" }}>Strike</span>Tips', 'Kaana<span style={{color:\'#ff4500\'}}>Predictions</span>'),
    ('SureStrikeTips', 'Kaana Predictions'),
    ('Sure Strike Tips', 'Kaana Predictions'),
    ('SureStrike', 'Kaana'),
    ('sst_admin_token', 'kp_admin_token'),
    ('"#c9a84c"', '"#ff4500"'),
    ('"#d4a844"', '"#ff5722"'),
    ('rgba(201,168,76,', 'rgba(255,69,0,'),
    ('#141211', '#09090b'),
    ('#1c1917', 'rgba(17,17,23,0.9)'),
    ('#faf5ef', '#f4f4f5'),
    ('#78716c', '#52525b'),
    ('#57534e', '#3f3f46'),
    ('#44403c', '#27272a'),
    ('Plus Jakarta Sans', 'Sora'),
]

for old, new in replacements:
    content = content.replace(old, new)

os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("File written successfully!")
