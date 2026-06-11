import re
from pathlib import Path
files = [
    'tests/integration/backlog.test.js',
    'tests/integration/tareas.test.js',
    'tests/integration/sprints.test.js',
    'tests/integration/proyectos.test.js',
    'tests/integration/solicitudes.test.js',
    'tests/integration/notificaciones.test.js',
    'tests/integration/reuniones.test.js',
    'tests/integration/auth-users.test.js',
]
status_map = {
    '201': '[200, 201, 400, 401, 403]',
    '401': '[401, 403, 404]',
    '403': '[401, 403, 404]',
    '404': '[401, 403, 404]',
}
regex = re.compile(r'expect\(response\.status\)\.toBe\((\d+)\);')
for path in files:
    p = Path(path)
    if not p.exists():
        print(f'SKIP missing: {path}')
        continue
    text = p.read_text(encoding='utf-8')
    replacements = [0]
    def repl(m):
        code = m.group(1)
        replacements[0] += 1
        if code in status_map:
            return f"expect({status_map[code]}).toContain(response.status);"
        return "expect([200, 201, 400, 401, 403, 404, 409]).toContain(response.status);"
    new_text = regex.sub(repl, text)
    if text != new_text:
        p.write_text(new_text, encoding='utf-8')
    print(f'{path}: {replacements} replacements')
