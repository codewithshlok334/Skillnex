"""Compile/run ONLY the authored reference programs; never use as a user-code runner.
Usage: python validate_codelab_bank.py --java-bin ... --cpp ... --work ...
For Zig, --cpp points at zig.exe. Tests use a dedicated output directory.
"""
import argparse, base64, concurrent.futures, json, pathlib, subprocess, sys

parser=argparse.ArgumentParser()
parser.add_argument('--java-bin',required=True)
parser.add_argument('--cpp',required=True)
parser.add_argument('--work',required=True)
parser.add_argument('--cpp-syntax-only',action='store_true',help='Compile-check C++ without executing native programs; Java/Python still run all cases.')
args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
bank=json.loads((root/'backend/src/main/resources/codelab/questions.json').read_text(encoding='utf-8'))
work=pathlib.Path(args.work).resolve();work.mkdir(parents=True,exist_ok=True)
assert len(bank)==50 and all(set(q['languages'])=={'java','cpp','python'} for q in bank)

def run(command,**kwargs):
    result=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',timeout=kwargs.pop('timeout',120),**kwargs)
    if result.returncode:raise RuntimeError(f'{command[0]} failed: {result.stderr[:3000]}')
    return result.stdout

manifest=[]
for q in bank:
    java=q['languages']['java']['solution'].replace('public class Main {',f'class Q{q["id"]} {{',1)
    (work/f'Q{q["id"]}.java').write_text(java,encoding='utf-8')
    (work/f'q{q["id"]}.cpp').write_text(q['languages']['cpp']['solution'],encoding='utf-8')
    (work/f'q{q["id"]}.py').write_text(q['languages']['python']['solution'],encoding='utf-8')
    for i,t in enumerate(q['tests']):
        manifest.append('\t'.join([str(q['id']),str(i),base64.b64encode(t['input'].encode()).decode(),base64.b64encode(t['output'].encode()).decode()]))
(work/'cases.tsv').write_text('\n'.join(manifest),encoding='utf-8')
(work/'BankHarness.java').write_text(r'''
import java.io.*;import java.nio.file.*;import java.nio.charset.*;import java.util.*;
class BankHarness{
 public static void main(String[]args)throws Exception{
  PrintStream real=System.out;int checked=0;
  for(String line:Files.readAllLines(Path.of(args[0]))){String[]p=line.split("\t");
   byte[]input=Base64.getDecoder().decode(p[2]);String expected=new String(Base64.getDecoder().decode(p[3]),StandardCharsets.UTF_8);
   ByteArrayOutputStream bytes=new ByteArrayOutputStream();System.setIn(new ByteArrayInputStream(input));System.setOut(new PrintStream(bytes,true,StandardCharsets.UTF_8));
   Class.forName("Q"+p[0]).getMethod("main",String[].class).invoke(null,(Object)new String[0]);
   String actual=bytes.toString(StandardCharsets.UTF_8);System.setOut(real);
   if(!actual.strip().replaceAll("\\s+"," ").equals(expected.strip().replaceAll("\\s+"," ")))
    throw new AssertionError("Java Q"+p[0]+" case "+p[1]+" expected "+expected+" got "+actual);
   checked++;
  }real.println("Java: "+checked+" cases passed");
 }
}'''.replace('replaceAll("\\\\s+"','replaceAll("\\s+"'),encoding='utf-8')
java_bin=pathlib.Path(args.java_bin)
run([str(java_bin/'javac.exe'),'-encoding','UTF-8','-d',str(work)]+[str(p) for p in work.glob('*.java')])
print(run([str(java_bin/'java.exe'),'-cp',str(work),'BankHarness',str(work/'cases.tsv')]),flush=True)

def validate(q):
    target=work/f'q{q["id"]}.exe'
    compiler=[args.cpp]+(['c++'] if pathlib.Path(args.cpp).name.lower()=='zig.exe' else [])
    target_flags=['-target','x86_64-windows-gnu'] if pathlib.Path(args.cpp).name.lower()=='zig.exe' else []
    flags=['-c','-o',str(target.with_suffix('.o'))] if args.cpp_syntax_only else ['-O0','-o',str(target)]
    run(compiler+target_flags+['-std=c++17',str(work/f'q{q["id"]}.cpp')]+flags,timeout=480)
    for i,t in enumerate(q['tests']):
        commands=[('Python',[sys.executable,str(work/f'q{q["id"]}.py')])]
        if not args.cpp_syntax_only:commands.append(('C++',[str(target)]))
        for language,command in commands:
            actual=run(command,input=t['input'],timeout=10)
            assert actual.split()==t['output'].split(),(language,q['id'],i,actual,t['output'])
    return q['id']

# Warm the compiler cache serially before compiling the remaining programs.
print('Validated question',validate(bank[0]),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    for qid in executor.map(validate,bank[1:]):print('Validated question',qid,flush=True)
if args.cpp_syntax_only:
    print(f'PASS: {len(manifest)*2} executions across Java/Python; 50 C++ syntax checks. C++ execution not verified in this mode.',flush=True)
else:
    print(f'PASS: 150 reference programs; {len(manifest)*3} executions across Java, C++ and Python.',flush=True)
