with open('src/app/globals.css', 'r') as f:
    content = f.read()
    content = content.replace('[data-theme="corporate"]', '[data-theme="corporate"]')
    f.write(content)
print("Fixed corporate theme typo")
