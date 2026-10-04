"""Authored SkillNex DSA collection. Rebuilds seed JSON; never touches a database.

Each question has two manually checked examples, edge cases, and three complete
reference programs. validate_codelab_bank.py also compiles/runs these programs.
"""
import contextlib, io, json, pathlib, sys, textwrap

ROOT = pathlib.Path(__file__).resolve().parents[1]
BANK = []
JAVA_HEAD = '''import java.io.*;
import java.util.*;
public class Main {
  static final class Fast {
    final BufferedInputStream in = new BufferedInputStream(System.in);
    String next() throws Exception { StringBuilder s=new StringBuilder(); int c; do {c=in.read();} while(c<=32 && c!=-1); while(c>32 && c!=-1){s.append((char)c);c=in.read();} return s.toString(); }
    int i() throws Exception { return Integer.parseInt(next()); }
    long l() throws Exception { return Long.parseLong(next()); }
  }
  public static void main(String[] args) throws Exception {
    Fast f = new Fast();
'''
CPP_HEAD = '#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <unordered_map>\n#include <unordered_set>\n#include <deque>\n#include <queue>\n#include <numeric>\n#include <climits>\n#include <tuple>\nusing namespace std;\nint main(){\n ios::sync_with_stdio(false); cin.tie(nullptr);\n'
PY_HEAD = 'import sys\nfrom collections import deque, Counter\nfrom bisect import bisect_left\nfrom heapq import heappush, heappop\ndata = iter(sys.stdin.read().split())\ndef ni(): return int(next(data))\n'

def output(code, input_text):
    old = sys.stdin
    result = io.StringIO()
    try:
        sys.stdin = io.StringIO(input_text)
        with contextlib.redirect_stdout(result): exec(code, {'__name__': '__main__'})
    finally: sys.stdin = old
    return result.getvalue().strip()+'\n'

def add(slug, title, topic, level, description, input_format, output_format, constraints,
        approach, complexity, hints, java, cpp, python, cases, examples, checker='TOKENS'):
    programs={'java':JAVA_HEAD+textwrap.dedent(java)+'\n  }\n}\n',
              'cpp':CPP_HEAD+textwrap.dedent(cpp)+'\n}\n',
              'python':PY_HEAD+textwrap.dedent(python).lstrip()}
    expected=[output(programs['python'],s) for s in cases]
    for i, manual in enumerate(examples):
        assert expected[i].split()==str(manual).split(), (slug,i,expected[i],manual)
    starters={
      'java':JAVA_HEAD+'    // Read the input with f.i(), f.l() or f.next().\n    // Implement your approach and print the required output.\n  }\n}\n',
      'cpp':CPP_HEAD+' // Read from cin, solve the problem, and print to cout.\n}\n',
      'python':'import sys\n\ndef solve():\n    # Read input from sys.stdin and print the required result.\n    pass\n\nif __name__ == "__main__":\n    solve()\n'}
    BANK.append(dict(id=len(BANK)+1,slug=slug,title=title,topic=topic,difficulty=level,checker=checker,
       statement=dict(description=description,inputFormat=input_format,outputFormat=output_format,
                      constraints=constraints,approach=approach,complexity=complexity,hints=hints),
       languages={lang:dict(starter=starters[lang],solution=code) for lang,code in programs.items()},
       tests=[dict(sample=i<2,input=s,output=expected[i]) for i,s in enumerate(cases)]))

add('trail-total','Trail Total','Arrays','Easy',
 'A walking tracker stores the change in altitude at each checkpoint. Find the total change over the whole trail.',
 'First line: n. Second line: n integers.', 'Print the sum as an integer.',
 ['1 ≤ n ≤ 200000','−10^9 ≤ each value ≤ 10^9; use 64-bit arithmetic.'],
 'Scan the readings once and accumulate them in a 64-bit total. Negative readings reduce the total.', 'O(n) time, O(1) auxiliary space.',
 ['You only need one running total.','Use long in Java and long long in C++ to avoid overflow.'],
 'int n=f.i(); long total=0; for(int i=0;i<n;i++)total+=f.l(); System.out.println(total);',
 'int n;cin>>n;long long total=0,x;while(n--){cin>>x;total+=x;}cout<<total;',
 'n=ni()\nprint(sum(ni() for _ in range(n)))',
 ['5\n3 -2 7 -4 6\n','3\n-5 -2 -1\n','1\n0\n','2\n1000000000 1000000000\n','4\n-9 9 -9 9\n','6\n1 1 1 1 1 1\n'], ['10','-8'])

add('runner-up-reading','Runner-up Reading','Arrays','Easy',
 'Find the second-largest distinct sensor reading. Repeated copies of the largest value do not count as the runner-up.',
 'n, followed by n integer readings.', 'Print the second-largest distinct value, or NONE if it does not exist.',
 ['1 ≤ n ≤ 200000','−10^9 ≤ reading ≤ 10^9'],
 'Track the largest and second-largest distinct values during one scan. Update the second only with a value different from the maximum.',
 'O(n) time, O(1) auxiliary space.', ['Duplicates of the maximum must be skipped.','Track two values and whether each has been initialized.'],
 'int n=f.i(); long a=Long.MIN_VALUE,b=Long.MIN_VALUE;for(int i=0;i<n;i++){long x=f.l();if(x>a){b=a;a=x;}else if(x<a&&x>b)b=x;}System.out.println(b==Long.MIN_VALUE?"NONE":Long.toString(b));',
 'int n;cin>>n;long long a=LLONG_MIN,b=LLONG_MIN,x;while(n--){cin>>x;if(x>a){b=a;a=x;}else if(x<a&&x>b)b=x;}if(b==LLONG_MIN)cout<<"NONE";else cout<<b;',
 'n=ni()\na=b=None\nfor _ in range(n):\n x=ni()\n if a is None or x>a: b,a=a,x\n elif x<a and (b is None or x>b): b=x\nprint("NONE" if b is None else b)',
 ['6\n4 9 9 2 7 7\n','3\n5 5 5\n','1\n-1\n','4\n-2 -8 -2 -5\n','2\n1 2\n','5\n0 -1 0 -2 -1\n'],['7','NONE'])

add('linked-loop','Linked Loop','Linked lists','Medium',
 'A singly linked chain is described by its next-node indices. Starting at node 0, decide whether following next pointers eventually visits a node twice. A pointer of -1 ends the chain. Unreachable cycles do not count.',
 'n, followed by n next-node indices.', 'Print YES if a cycle is reachable from node 0, otherwise NO.',
 ['1 ≤ n ≤ 200000','Each next index is -1 or between 0 and n−1.'],
 'Use Floyd’s slow/fast pointers starting from node 0. Stop on -1; a meeting before termination proves a reachable cycle.',
 'O(n) time, O(1) auxiliary space beyond the input.', ['Only nodes reachable from node 0 matter.','Move one pointer one edge and the other two edges per step.'],
 'int n=f.i();int[] a=new int[n];for(int i=0;i<n;i++)a[i]=f.i();int slow=0,fast=0;boolean loop=false;while(fast!=-1&&a[fast]!=-1){slow=a[slow];fast=a[a[fast]];if(slow==fast){loop=true;break;}}System.out.println(loop?"YES":"NO");',
 'int n;cin>>n;vector<int>a(n);for(int&x:a)cin>>x;int s=0,f=0;bool loop=false;while(f!=-1&&a[f]!=-1){s=a[s];f=a[a[f]];if(s==f){loop=true;break;}}cout<<(loop?"YES":"NO");',
 'n=ni()\na=[ni() for _ in range(n)]\ns=f=0\nloop=False\nwhile f!=-1 and a[f]!=-1:\n s=a[s];f=a[a[f]]\n if s==f:\n  loop=True;break\nprint("YES" if loop else "NO")',
 ['4\n1 2 3 1\n','4\n1 -1 3 2\n','1\n-1\n','1\n0\n','5\n1 2 3 4 -1\n','3\n2 -1 1\n'],['YES','NO'])

add('reverse-linked-route','Reverse Linked Route','Linked lists','Easy',
 'A delivery route is stored as a singly linked list of stop values. Reverse its links and print the stops in the new order.',
 'n, followed by n stop values.', 'Print the values of the reversed list, separated by spaces.',
 ['1 ≤ n ≤ 200000','−10^9 ≤ stop value ≤ 10^9'],
 'Build the list, then keep previous, current and next pointers. Redirect current.next to previous before advancing. Print the reversed head.',
 'O(n) time, O(1) extra space after building the input list.', ['Save the next pointer before changing a link.','The last visited node becomes the new head.'],
 'class Node{long v;Node next;Node(long v){this.v=v;}} int n=f.i();Node head=null,tail=null;for(int i=0;i<n;i++){Node p=new Node(f.l());if(head==null)head=p;else tail.next=p;tail=p;}Node prev=null;while(head!=null){Node next=head.next;head.next=prev;prev=head;head=next;}StringBuilder out=new StringBuilder();for(Node p=prev;p!=null;p=p.next)out.append(p.v).append(" ");System.out.println(out);',
 'struct Node{long long v;Node*next=nullptr;};int n;cin>>n;Node*head=nullptr,*tail=nullptr;while(n--){long long x;cin>>x;auto*p=new Node{x};if(!head)head=p;else tail->next=p;tail=p;}Node*prev=nullptr;while(head){auto*next=head->next;head->next=prev;prev=head;head=next;}while(prev){cout<<prev->v<<" ";auto*next=prev->next;delete prev;prev=next;}',
 'class Node:\n def __init__(self,v):self.v=v;self.next=None\nn=ni();head=tail=None\nfor _ in range(n):\n p=Node(ni())\n if head is None:head=p\n else:tail.next=p\n tail=p\nprev=None\nwhile head is not None:\n nxt=head.next;head.next=prev;prev=head;head=nxt\nout=[]\nwhile prev is not None:out.append(str(prev.v));prev=prev.next\nprint(" ".join(out))',
 ['4\n8 3 5 1\n','1\n42\n','2\n-1 0\n','5\n1 1 2 2 3\n','3\n1000000000 0 -1000000000\n','6\n1 2 3 4 5 6\n'],['1 5 3 8','42'])

add('rotate-checkpoints','Rotate Checkpoints','Arrays','Easy',
 'Rotate a checkpoint sequence k places to the right. Values wrapping past the end reappear at the beginning.',
 'n and k, followed by n integers.', 'Print the rotated sequence.',
 ['1 ≤ n ≤ 200000','0 ≤ k ≤ 10^9','−10^9 ≤ value ≤ 10^9'],
 'Reduce k modulo n. The output starts at index (n−k) modulo n, then wraps around.', 'O(n) time, O(n) input storage.',
 ['Rotating by n changes nothing.','Use modulo indexing to avoid repeated shifts.'],
 'int n=f.i(),k=f.i()%n;long[]a=new long[n];for(int i=0;i<n;i++)a[i]=f.l();StringBuilder s=new StringBuilder();for(int i=0;i<n;i++)s.append(a[(i+n-k)%n]).append(" ");System.out.println(s);',
 'int n,k;cin>>n>>k;k%=n;vector<long long>a(n);for(auto&x:a)cin>>x;for(int i=0;i<n;i++)cout<<a[(i+n-k)%n]<<" ";',
 'n=ni();k=ni()%n;a=[ni() for _ in range(n)]\nprint(*(a[-k:]+a[:-k] if k else a))',
 ['5 2\n1 2 3 4 5\n','3 6\n7 8 9\n','1 1000000000\n3\n','4 0\n1 -1 2 -2\n','3 4\n1 2 3\n','2 1\n8 9\n'],['4 5 1 2 3','7 8 9'])

add('park-the-zeroes','Park the Zeroes','Arrays','Easy',
 'Move all zero readings to the end while preserving the order of every nonzero reading.',
 'n, followed by n integers.', 'Print the rearranged sequence.', ['1 ≤ n ≤ 200000','−10^9 ≤ value ≤ 10^9'],
 'Compact nonzero values with a write pointer, then fill the remaining positions with zero.', 'O(n) time, O(1) extra space beyond the array.',
 ['The relative order of nonzero values must stay the same.','A write pointer can lag behind the read pointer.'],
 'int n=f.i();long[]a=new long[n];int w=0;for(int i=0;i<n;i++){long x=f.l();if(x!=0)a[w++]=x;}StringBuilder s=new StringBuilder();for(long x:a)s.append(x).append(" ");System.out.println(s);',
 'int n;cin>>n;vector<long long>a(n,0);int w=0;for(int i=0;i<n;i++){long long x;cin>>x;if(x)a[w++]=x;}for(auto x:a)cout<<x<<" ";',
 'n=ni();a=[ni() for _ in range(n)];b=[x for x in a if x!=0]\nprint(*(b+[0]*(n-len(b))))',
 ['6\n0 4 0 -2 8 0\n','3\n1 2 3\n','1\n0\n','4\n0 0 0 0\n','3\n-1 0 -2\n','5\n1 0 0 0 2\n'],['4 -2 8 0 0 0','1 2 3'])

add('distinct-checkpoints','Distinct Checkpoints','Arrays','Easy',
 'A sorted checkpoint log may repeat values. Print each distinct value once, in increasing order.',
 'n, followed by n integers in nondecreasing order.', 'Print the distinct values separated by spaces.',
 ['1 ≤ n ≤ 200000','−10^9 ≤ value ≤ 10^9'],
 'Keep the previous value. A value starts a new group exactly when it differs from its predecessor.', 'O(n) time, O(1) auxiliary space.',
 ['Equal values are adjacent in sorted input.','No hash set is needed.'],
 'int n=f.i();long prev=Long.MIN_VALUE;StringBuilder s=new StringBuilder();for(int i=0;i<n;i++){long x=f.l();if(x!=prev)s.append(x).append(" ");prev=x;}System.out.println(s);',
 'int n;cin>>n;long long prev=LLONG_MIN,x;while(n--){cin>>x;if(x!=prev)cout<<x<<" ";prev=x;}',
 'n=ni();prev=None;out=[]\nfor _ in range(n):\n x=ni()\n if x!=prev:out.append(x)\n prev=x\nprint(*out)',
 ['7\n1 1 2 3 3 3 8\n','3\n-2 -2 -2\n','1\n0\n','4\n-3 -2 -1 0\n','4\n0 0 0 1\n','2\n9 9\n'],['1 2 3 8','-2'])

add('missing-ticket','Missing Ticket','Bit manipulation','Easy',
 'Tickets are numbered from 0 through n. You receive n distinct ticket numbers; exactly one is missing. Find it.',
 'n, followed by n distinct numbers from 0 through n.', 'Print the missing number.', ['1 ≤ n ≤ 200000'],
 'XOR every expected label and every received label. Paired labels cancel, leaving the missing one.', 'O(n) time, O(1) auxiliary space.',
 ['x XOR x is zero.','The missing number can be 0 or n.'],
 'int n=f.i(),x=n;for(int i=0;i<n;i++)x^=i^f.i();System.out.println(x);',
 'int n;cin>>n;int x=n,a;for(int i=0;i<n;i++){cin>>a;x^=i^a;}cout<<x;',
 'n=ni();x=n\nfor i in range(n):x^=i^ni()\nprint(x)',
 ['4\n4 1 0 2\n','3\n1 2 3\n','1\n0\n','1\n1\n','5\n0 1 2 3 4\n','6\n6 0 1 3 4 5\n'],['3','0'])

add('unpaired-badge','Unpaired Badge','Bit manipulation','Easy',
 'Every badge ID appears exactly twice, except one ID appearing once. Recover the unpaired ID.',
 'Odd n, followed by n nonnegative badge IDs.', 'Print the ID appearing once.', ['1 ≤ n ≤ 199999','0 ≤ badge ID ≤ 10^9'],
 'XOR all IDs. Equal pairs cancel regardless of their positions.', 'O(n) time, O(1) auxiliary space.',
 ['The same ID XOR itself disappears.','No sorting is needed.'],
 'int n=f.i(),x=0;for(int i=0;i<n;i++)x^=f.i();System.out.println(x);',
 'int n,x=0,a;cin>>n;while(n--){cin>>a;x^=a;}cout<<x;',
 'n=ni();x=0\nfor _ in range(n):x^=ni()\nprint(x)',
 ['5\n7 2 7 9 2\n','1\n0\n','3\n5 5 8\n','7\n1 2 3 4 3 2 1\n','3\n0 1 1\n','5\n1000000000 4 4 8 8\n'],['9','0'])

add('one-good-trade','One Good Trade','Arrays','Easy',
 'Given daily prices, choose at most one buy followed by one sell on a later day. Find the largest profit. You may skip trading.',
 'n, followed by n prices.', 'Print the maximum profit, or 0 when no profitable trade exists.',
 ['1 ≤ n ≤ 200000','0 ≤ price ≤ 10^9'],
 'Track the smallest earlier price and the best profit seen. Evaluate selling today before advancing.', 'O(n) time, O(1) auxiliary space.',
 ['The buy day must precede the sell day.','Keep the cheapest price seen so far.'],
 'int n=f.i();long low=Long.MAX_VALUE,best=0;for(int i=0;i<n;i++){long x=f.l();low=Math.min(low,x);best=Math.max(best,x-low);}System.out.println(best);',
 'int n;cin>>n;long long low=LLONG_MAX,best=0,x;while(n--){cin>>x;low=min(low,x);best=max(best,x-low);}cout<<best;',
 'n=ni();low=float("inf");best=0\nfor _ in range(n):\n x=ni();low=min(low,x);best=max(best,x-low)\nprint(best)',
 ['6\n9 2 5 1 8 4\n','4\n9 7 4 1\n','1\n8\n','3\n2 2 2\n','2\n0 1000000000\n','5\n1 4 2 9 0\n'],['7','0'])

if __name__ == '__main__':
    for part in sorted((ROOT/'scripts/codelab_bank').glob('*.py')):
        exec(compile(part.read_text(encoding='utf-8'),str(part),'exec'),globals())
    assert len(BANK)==50, len(BANK)
    assert len({q['slug'] for q in BANK})==50
    target=ROOT/'backend/src/main/resources/codelab/questions.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(BANK,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Wrote {len(BANK)} original questions, {len(BANK)*3} solutions, {sum(len(q["tests"]) for q in BANK)} test cases.')
