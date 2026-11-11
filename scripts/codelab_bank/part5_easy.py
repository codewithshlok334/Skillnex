"""Append-only curated Easy practice. Original text and stdin/stdout adapters."""

def _easy_array(values, prefix=''):
    return str(len(values)) + (' ' + prefix if prefix else '') + '\n' + ' '.join(map(str, values)) + '\n'


add('curated-two-sum', 'Two Sum', 'Hashing', 'Easy',
    'Find two different positions whose values add up to the target. Every input has at least one valid pair. If several pairs work, you may return any of them.',
    'n and target, followed by n integer values. Positions are numbered from 0.',
    'Print two distinct valid positions in either order.',
    ['2 ≤ n ≤ 200000', '−10^9 ≤ value ≤ 10^9; −2×10^9 ≤ target ≤ 2×10^9', 'At least one valid pair exists.'],
    'Scan left to right while mapping earlier values to positions. Before recording the current value, look up target minus that value. A match uses two different positions.',
    'O(n) expected time and O(n) auxiliary space.',
    ['Look for a complement rather than trying every pair.', 'Check the map before adding the current position.'],
    '''int n=f.i();long target=f.l();Map<Long,Integer> seen=new HashMap<>();int a=-1,b=-1;
       for(int i=0;i<n;i++){long x=f.l();if(a==-1&&seen.containsKey(target-x)){a=seen.get(target-x);b=i;}seen.put(x,i);}
       System.out.println(a+" "+b);''',
    '''int n;long long target;cin>>n>>target;unordered_map<long long,int> seen;int a=-1,b=-1;
       for(int i=0;i<n;i++){long long x;cin>>x;auto it=seen.find(target-x);if(a==-1&&it!=seen.end()){a=it->second;b=i;}seen[x]=i;}cout<<a<<" "<<b;''',
    '''n=ni();target=ni();seen={};answer=None
for i in range(n):
 x=ni()
 if answer is None and target-x in seen:answer=(seen[target-x],i)
 seen[x]=i
print(*answer)''',
    [_easy_array([2,7,11,15],'9'), _easy_array([3,3],'6'), _easy_array([-3,4,3,90],'0'),
     _easy_array([0,4,0],'0'), _easy_array([1000000000,1000000000],'2000000000'),
     _easy_array([1,4,2,3],'5'), _easy_array(list(range(5000)),'9997')],
    ['0 1','0 1'], checker='PAIR_INDICES')

add('curated-contains-duplicate', 'Contains Duplicate', 'Hashing', 'Easy',
    'Determine whether an integer sequence contains the same value at two or more positions.',
    'n, followed by n integers.', 'Print YES if any value repeats; otherwise print NO.',
    ['1 ≤ n ≤ 200000', '−10^9 ≤ value ≤ 10^9'],
    'Insert each value into a set. An insertion of a value that is already present proves a duplicate exists.',
    'O(n) expected time and O(n) auxiliary space.',
    ['A set records which values you have already visited.', 'Equal values need not be adjacent.'],
    '''int n=f.i();Set<Long> seen=new HashSet<>();boolean duplicate=false;for(int i=0;i<n;i++)if(!seen.add(f.l()))duplicate=true;System.out.println(duplicate?"YES":"NO");''',
    '''int n;cin>>n;unordered_set<long long> seen;bool duplicate=false;while(n--){long long x;cin>>x;if(!seen.insert(x).second)duplicate=true;}cout<<(duplicate?"YES":"NO");''',
    '''n=ni();seen=set();duplicate=False
for _ in range(n):
 x=ni()
 if x in seen:duplicate=True
 seen.add(x)
print('YES' if duplicate else 'NO')''',
    [_easy_array([1,2,3,1]), _easy_array([1,2,3,4]), _easy_array([0]), _easy_array([-5,-5]),
     _easy_array([-1000000000,0,1000000000]), _easy_array([7]*2000), _easy_array(list(range(5000)))],
    ['YES','NO'])

add('curated-valid-anagram', 'Valid Anagram', 'Strings', 'Easy',
    'Decide whether the letters of one string can be rearranged to form the other. Each letter must be used exactly as many times as it occurs.',
    'Two whitespace-separated lowercase English strings. Use the single token - for an empty string.',
    'Print YES if the strings are anagrams; otherwise print NO.',
    ['0 ≤ length of each string ≤ 200000', 'Nonempty strings contain only a through z.'],
    'Count each letter in the first string and subtract counts from the second. The strings are anagrams exactly when every final count is zero.',
    'O(n+m) time and O(1) auxiliary space for 26 counters.',
    ['Matching sets of letters is insufficient when frequencies differ.', 'An empty string is an anagram of another empty string.'],
    '''String a=f.next(),b=f.next();if(a.equals("-"))a="";if(b.equals("-"))b="";int[] count=new int[26];for(int i=0;i<a.length();i++)count[a.charAt(i)-'a']++;for(int i=0;i<b.length();i++)count[b.charAt(i)-'a']--;boolean ok=true;for(int x:count)if(x!=0)ok=false;System.out.println(ok?"YES":"NO");''',
    '''string a,b;cin>>a>>b;if(a=="-")a="";if(b=="-")b="";int count[26]={};for(char c:a)count[c-'a']++;for(char c:b)count[c-'a']--;bool ok=true;for(int x:count)if(x)ok=false;cout<<(ok?"YES":"NO");''',
    '''a=next(data);b=next(data)
if a=='-':a=''
if b=='-':b=''
count=[0]*26
for c in a:count[ord(c)-97]+=1
for c in b:count[ord(c)-97]-=1
print('YES' if all(x==0 for x in count) else 'NO')''',
    ['anagram nagaram\n','rat car\n','- -\n','- a\n','aab abb\n','a a\n',('a'*2500+'b'*2500)+' '+('b'*2500+'a'*2500)+'\n'],
    ['YES','NO'])

add('curated-best-time-to-buy-and-sell-stock', 'Best Time to Buy and Sell Stock', 'Arrays', 'Easy',
    'Each value is a stock price on one day. You may buy once and sell on a later day, or make no trade. Find the largest possible profit.',
    'n, followed by n daily prices in chronological order.', 'Print the maximum profit. Print 0 if no profitable trade is possible.',
    ['1 ≤ n ≤ 200000', '0 ≤ price ≤ 10^9'],
    'Keep the lowest price seen so far and the best profit. For each price, consider selling after the cheapest earlier purchase, then update the minimum price.',
    'O(n) time and O(1) auxiliary space.',
    ['A low price after a high price cannot be used to profit from that earlier day.', 'The answer is never negative because a trade is optional.'],
    '''int n=f.i();long low=f.l(),best=0;for(int i=1;i<n;i++){long price=f.l();best=Math.max(best,price-low);low=Math.min(low,price);}System.out.println(best);''',
    '''int n;cin>>n;long long low,best=0;cin>>low;for(int i=1;i<n;i++){long long price;cin>>price;best=max(best,price-low);low=min(low,price);}cout<<best;''',
    '''n=ni();low=ni();best=0
for _ in range(n-1):
 price=ni();best=max(best,price-low);low=min(low,price)
print(best)''',
    [_easy_array([7,1,5,3,6,4]), _easy_array([7,6,4,3,1]), _easy_array([8]), _easy_array([2,2,2]),
     _easy_array([0,1000000000]), _easy_array([10,2,8,1,4]), _easy_array(list(range(5000)))],
    ['5','0'])

add('curated-valid-palindrome', 'Valid Palindrome', 'Strings', 'Easy',
    'Read a text line, ignore every character except ASCII letters and digits, and compare letters without regard to case. Decide whether the remaining sequence reads the same forwards and backwards.',
    'One line of printable ASCII text, including spaces if desired. The single character - represents an empty string.',
    'Print YES if the normalized sequence is a palindrome; otherwise print NO. A sequence with no letters or digits is a palindrome.',
    ['0 ≤ text length ≤ 200000', 'ASCII letters A–Z and a–z and digits 0–9 are the only significant characters.'],
    'Move two pointers inward. Skip non-alphanumeric characters on each side and compare significant characters after ASCII case conversion. Input whitespace may be discarded because it is insignificant.',
    'O(n) time and O(1) auxiliary space beyond the input text.',
    ['Digits remain significant.', 'Punctuation and spaces do not affect the answer.'],
    '''StringBuilder text=new StringBuilder();String token;while(!(token=f.next()).isEmpty())text.append(token);String s=text.toString();int l=0,r=s.length()-1;boolean ok=true;
       while(l<r){char a=s.charAt(l),b=s.charAt(r);boolean aa=(a>='a'&&a<='z')||(a>='A'&&a<='Z')||(a>='0'&&a<='9');boolean bb=(b>='a'&&b<='z')||(b>='A'&&b<='Z')||(b>='0'&&b<='9');if(!aa){l++;continue;}if(!bb){r--;continue;}if(a>='A'&&a<='Z')a=(char)(a+32);if(b>='A'&&b<='Z')b=(char)(b+32);if(a!=b){ok=false;break;}l++;r--;}System.out.println(ok?"YES":"NO");''',
    '''string s,token;while(cin>>token)s+=token;int l=0,r=(int)s.size()-1;bool ok=true;
       auto alnum=[](char c){return (c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9');};
       while(l<r){char a=s[l],b=s[r];if(!alnum(a)){l++;continue;}if(!alnum(b)){r--;continue;}if(a>='A'&&a<='Z')a+=32;if(b>='A'&&b<='Z')b+=32;if(a!=b){ok=false;break;}l++;r--;}cout<<(ok?"YES":"NO");''',
    '''s=''.join(data);l=0;r=len(s)-1;ok=True
while l<r:
 if not s[l].isalnum():l+=1;continue
 if not s[r].isalnum():r-=1;continue
 if s[l].lower()!=s[r].lower():ok=False;break
 l+=1;r-=1
print('YES' if ok else 'NO')''',
    ['A man, a plan, a canal: Panama\n','race a car\n','-\n','., !?\n','0P\n','a\n','a'*10000+'B'+'a'*10000+'\n'],
    ['YES','NO'])

add('curated-binary-search', 'Binary Search', 'Binary search', 'Easy',
    'Find a target value in a strictly increasing integer array. Return its zero-based position, or report that it is absent.',
    'n and target, followed by n integers in strictly increasing order.', 'Print the target position, or -1 if it is absent.',
    ['1 ≤ n ≤ 200000', '−10^9 ≤ target and each value ≤ 10^9'],
    'Maintain the possible interval of positions. Compare its middle value with the target and discard the half that cannot contain it.',
    'O(log n) search time and O(1) auxiliary space after reading the O(n) input.',
    ['The array is already sorted and has no duplicates.', 'Choose the middle as left + (right − left) / 2.'],
    '''int n=f.i();long target=f.l();long[] a=new long[n];for(int i=0;i<n;i++)a[i]=f.l();int l=0,r=n-1,result=-1;while(l<=r){int m=l+(r-l)/2;if(a[m]==target){result=m;break;}if(a[m]<target)l=m+1;else r=m-1;}System.out.println(result);''',
    '''int n;long long target;cin>>n>>target;vector<long long>a(n);for(auto&x:a)cin>>x;int l=0,r=n-1,result=-1;while(l<=r){int m=l+(r-l)/2;if(a[m]==target){result=m;break;}if(a[m]<target)l=m+1;else r=m-1;}cout<<result;''',
    '''n=ni();target=ni();a=[ni() for _ in range(n)];l=0;r=n-1;result=-1
while l<=r:
 m=l+(r-l)//2
 if a[m]==target:result=m;break
 if a[m]<target:l=m+1
 else:r=m-1
print(result)''',
    [_easy_array([-1,0,3,5,9,12],'9'), _easy_array([-1,0,3,5,9,12],'2'), _easy_array([5],'5'),
     _easy_array([5],'4'), _easy_array([-1000000000,0,1000000000],'-1000000000'),
     _easy_array([1,3,5],'5'), _easy_array(list(range(0,10000,2)),'9999')], ['4','-1'])

add('curated-move-zeroes', 'Move Zeroes', 'Arrays', 'Easy',
    'Rearrange an array so that every zero comes after every nonzero value. Preserve the original relative order of all nonzero values and perform the rearrangement in the input array.',
    'n, followed by n integers.', 'Print all n values after rearrangement, separated by spaces.',
    ['1 ≤ n ≤ 4000', '−10^9 ≤ value ≤ 10^9'],
    'Use a write position for the next nonzero value. Copy each nonzero value there while scanning, then fill the remaining suffix with zero.',
    'O(n) time and O(1) auxiliary space beyond the input array and output buffer.',
    ['A write pointer never moves ahead of the read pointer.', 'Fill with zero only after all nonzero values have been copied.'],
    '''int n=f.i();long[] a=new long[n];for(int i=0;i<n;i++)a[i]=f.l();int w=0;for(int i=0;i<n;i++)if(a[i]!=0)a[w++]=a[i];while(w<n)a[w++]=0;StringBuilder out=new StringBuilder();for(long x:a)out.append(x).append(' ');System.out.println(out);''',
    '''int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;int w=0;for(int i=0;i<n;i++)if(a[i])a[w++]=a[i];while(w<n)a[w++]=0;for(auto x:a)cout<<x<<" ";''',
    '''n=ni();a=[ni() for _ in range(n)];w=0
for i in range(n):
 if a[i]!=0:a[w]=a[i];w+=1
while w<n:a[w]=0;w+=1
print(*a)''',
    [_easy_array([0,1,0,3,12]), _easy_array([0]), _easy_array([1,2,3]), _easy_array([0,0,0]),
     _easy_array([-1,0,-2,0,3]), _easy_array([1,0,0,0,2]), _easy_array([0,1]*1000)],
    ['1 3 12 0 0','0'])

add('curated-majority-element', 'Majority Element', 'Arrays', 'Easy',
    'An array contains a value that occurs strictly more than half of the time. Find that value. The existence of such a majority is guaranteed.',
    'n, followed by n integers.', 'Print the majority value.',
    ['1 ≤ n ≤ 200000', '−10^9 ≤ value ≤ 10^9', 'Exactly one value occurs more than floor(n/2) times.'],
    'Use Boyer–Moore voting. When the balance is zero, select the current value as candidate. Increase the balance for the candidate and decrease it for other values. Pairwise cancellations cannot remove the guaranteed majority.',
    'O(n) time and O(1) auxiliary space.',
    ['Cancel pairs of different values.', 'No verification pass is required because a majority is guaranteed.'],
    '''int n=f.i(),balance=0;long candidate=0;for(int i=0;i<n;i++){long x=f.l();if(balance==0)candidate=x;balance+=x==candidate?1:-1;}System.out.println(candidate);''',
    '''int n,balance=0;long long candidate=0;cin>>n;while(n--){long long x;cin>>x;if(balance==0)candidate=x;balance+=x==candidate?1:-1;}cout<<candidate;''',
    '''n=ni();balance=0;candidate=0
for _ in range(n):
 x=ni()
 if balance==0:candidate=x
 balance+=1 if x==candidate else -1
print(candidate)''',
    [_easy_array([3,2,3]), _easy_array([2,2,1,1,1,2,2]), _easy_array([0]),
     _easy_array([-1,-1,-1,2,3]), _easy_array([1000000000,1000000000]),
     _easy_array([1,2,1,2,1]), _easy_array(list(range(2000))+[1000000000]*2001)],
    ['3','2'])

add('curated-single-number', 'Single Number', 'Bit manipulation', 'Easy',
    'Every integer in a nonempty array occurs exactly twice except one integer that occurs once. Find the integer without a partner.',
    'Odd n, followed by n integers.', 'Print the value occurring once.',
    ['1 ≤ n ≤ 199999', '−10^9 ≤ value ≤ 10^9', 'One value occurs once; every other distinct value occurs exactly twice.'],
    'XOR every value into one accumulator. A number XOR itself is zero, so all pairs cancel and the unpaired value remains.',
    'O(n) time and O(1) auxiliary space.',
    ['XOR is independent of the order of the values.', 'Negative numbers can also be combined with integer XOR.'],
    '''int n=f.i(),answer=0;for(int i=0;i<n;i++)answer^=f.i();System.out.println(answer);''',
    '''int n,answer=0;cin>>n;while(n--){int x;cin>>x;answer^=x;}cout<<answer;''',
    '''n=ni();answer=0
for _ in range(n):answer^=ni()
print(answer)''',
    [_easy_array([2,2,1]), _easy_array([4,1,2,1,2]), _easy_array([0]),
     _easy_array([-3,2,2]), _easy_array([0,-1000000000,0]),
     _easy_array([1000000000,-1,-1]), _easy_array(list(range(2500))+[9000]+list(reversed(range(2500))))],
    ['1','4'])

add('curated-valid-parentheses', 'Valid Parentheses', 'Stacks', 'Easy',
    'A bracket string is valid when each opening bracket is closed by the same bracket type and bracket pairs are properly nested. Decide whether the entire string is valid.',
    'One token containing only (, ), [, ], {, and }. Use - for the empty string.',
    'Print YES for a valid bracket string; otherwise print NO.',
    ['0 ≤ length ≤ 200000'],
    'Push opening brackets onto a stack. Each closing bracket must match the most recent unmatched opening bracket. The stack must be empty after the scan.',
    'O(n) time and O(n) auxiliary space.',
    ['Equal numbers of opening and closing brackets are not enough.', 'A closing bracket with an empty stack is invalid.'],
    '''String s=f.next();if(s.equals("-"))s="";ArrayDeque<Character> stack=new ArrayDeque<>();boolean ok=true;for(char c:s.toCharArray()){if(c=='('||c=='['||c=='{')stack.push(c);else{char wanted=c==')'?'(':c==']'?'[':'{';if(stack.isEmpty()||stack.pop()!=wanted){ok=false;break;}}}System.out.println(ok&&stack.isEmpty()?"YES":"NO");''',
    '''string s;cin>>s;if(s=="-")s="";vector<char>stack;bool ok=true;for(char c:s){if(c=='('||c=='['||c=='{')stack.push_back(c);else{char wanted=c==')'?'(':c==']'?'[':'{';if(stack.empty()||stack.back()!=wanted){ok=false;break;}stack.pop_back();}}cout<<(ok&&stack.empty()?"YES":"NO");''',
    '''s=next(data);s='' if s=='-' else s;stack=[];ok=True;pairs={')':'(',']':'[','}':'{'}
for c in s:
 if c in '([{':stack.append(c)
 elif not stack or stack.pop()!=pairs[c]:ok=False;break
print('YES' if ok and not stack else 'NO')''',
    ['()[]{}\n','([)]\n','-\n',']\n','((\n','{[()]}\n','('*10000+')'*10000+'\n'],
    ['YES','NO'])

add('curated-reverse-linked-list', 'Reverse Linked List', 'Linked lists', 'Easy',
    'Build a singly linked list from the input values, reverse its links, and print the values starting at the new head. An empty input list remains empty.',
    'n, followed by n values in head-to-tail order.', 'Print the reversed values separated by spaces, or EMPTY when n is 0.',
    ['0 ≤ n ≤ 4000', '−10^9 ≤ value ≤ 10^9'],
    'Keep previous and current nodes. Save the current node’s next link, redirect it to previous, and advance. The last processed node is the reversed head.',
    'O(n) time and O(1) auxiliary space beyond the input list and output buffer.',
    ['Save the next node before changing a link.', 'Initialize the previous pointer to null.'],
    '''class Node{long value;Node next;Node(long v){value=v;}}int n=f.i();Node head=null,tail=null;for(int i=0;i<n;i++){Node p=new Node(f.l());if(head==null)head=p;else tail.next=p;tail=p;}Node prev=null;while(head!=null){Node next=head.next;head.next=prev;prev=head;head=next;}StringBuilder out=new StringBuilder();for(Node p=prev;p!=null;p=p.next)out.append(p.value).append(' ');System.out.println(n==0?"EMPTY":out.toString());''',
    '''struct Node{long long value;Node*next=nullptr;};int n;cin>>n;Node*head=nullptr,*tail=nullptr;for(int i=0;i<n;i++){long long x;cin>>x;Node*p=new Node{x};if(!head)head=p;else tail->next=p;tail=p;}Node*prev=nullptr;while(head){Node*next=head->next;head->next=prev;prev=head;head=next;}if(n==0)cout<<"EMPTY";while(prev){cout<<prev->value<<" ";Node*next=prev->next;delete prev;prev=next;}''',
    '''class Node:
 def __init__(self,value):self.value=value;self.next=None
n=ni();head=tail=None
for _ in range(n):
 p=Node(ni())
 if head is None:head=p
 else:tail.next=p
 tail=p
prev=None
while head is not None:
 nxt=head.next;head.next=prev;prev=head;head=nxt
out=[]
while prev is not None:out.append(str(prev.value));prev=prev.next
print(' '.join(out) if out else 'EMPTY')''',
    [_easy_array([1,2,3,4,5]), _easy_array([1,2]), _easy_array([]), _easy_array([42]),
     _easy_array([-1000000000,0,1000000000]), _easy_array([7,7,7]), _easy_array(list(range(1500)))],
    ['5 4 3 2 1','2 1'])

def _easy_lists(a,b):
    return f'{len(a)} {len(b)}\n'+' '.join(map(str,a))+'\n'+' '.join(map(str,b))+'\n'

add('curated-merge-two-sorted-lists', 'Merge Two Sorted Lists', 'Linked lists', 'Easy',
    'Build two singly linked lists whose values are in nondecreasing order. Merge their existing nodes into one sorted list, retaining every value and every duplicate.',
    'n and m, followed by n values for the first list and then m values for the second list.',
    'Print the merged values in nondecreasing order, or EMPTY when both lists are empty.',
    ['0 ≤ n,m; n+m ≤ 4000', '−10^9 ≤ value ≤ 10^9', 'Each input list is sorted in nondecreasing order.'],
    'Maintain a tail behind a dummy head. Repeatedly attach the smaller current node and advance that list. Attach the remaining suffix when one list ends.',
    'O(n+m) time and O(1) auxiliary space beyond the input nodes and output buffer.',
    ['Use a dummy head to simplify appending the first node.', 'Do not drop equal values.'],
    '''class Node{long value;Node next;Node(long v){value=v;}}int n=f.i(),m=f.i();Node[] heads=new Node[2];for(int k=0;k<2;k++){Node tail=null;for(int i=0;i<(k==0?n:m);i++){Node p=new Node(f.l());if(tail==null)heads[k]=p;else tail.next=p;tail=p;}}Node a=heads[0],b=heads[1],dummy=new Node(0),tail=dummy;while(a!=null&&b!=null){if(a.value<=b.value){tail.next=a;a=a.next;}else{tail.next=b;b=b.next;}tail=tail.next;}tail.next=a!=null?a:b;StringBuilder out=new StringBuilder();for(Node p=dummy.next;p!=null;p=p.next)out.append(p.value).append(' ');System.out.println(n+m==0?"EMPTY":out.toString());''',
    '''struct Node{long long value;Node*next=nullptr;};int n,m;cin>>n>>m;Node*heads[2]={nullptr,nullptr};for(int k=0;k<2;k++){Node*tail=nullptr;for(int i=0;i<(k==0?n:m);i++){long long x;cin>>x;Node*p=new Node{x};if(!tail)heads[k]=p;else tail->next=p;tail=p;}}Node*a=heads[0],*b=heads[1];Node dummy{0};Node*tail=&dummy;while(a&&b){if(a->value<=b->value){tail->next=a;a=a->next;}else{tail->next=b;b=b->next;}tail=tail->next;}tail->next=a?a:b;Node*p=dummy.next;if(!p)cout<<"EMPTY";while(p){cout<<p->value<<" ";Node*next=p->next;delete p;p=next;}''',
    '''class Node:
 def __init__(self,value):self.value=value;self.next=None
n=ni();m=ni();heads=[]
for count in (n,m):
 head=tail=None
 for _ in range(count):
  p=Node(ni())
  if head is None:head=p
  else:tail.next=p
  tail=p
 heads.append(head)
a,b=heads;dummy=tail=Node(0)
while a is not None and b is not None:
 if a.value<=b.value:tail.next=a;a=a.next
 else:tail.next=b;b=b.next
 tail=tail.next
tail.next=a if a is not None else b
p=dummy.next;out=[]
while p is not None:out.append(str(p.value));p=p.next
print(' '.join(out) if out else 'EMPTY')''',
    [_easy_lists([1,2,4],[1,3,4]), _easy_lists([],[0]), _easy_lists([],[]), _easy_lists([-2,-1],[]),
     _easy_lists([1,1],[1,1]), _easy_lists([-1000000000],[1000000000]), _easy_lists(list(range(0,1500,2)),list(range(1,1500,2)))],
    ['1 1 2 3 4 4','0'])

def _easy_cycle(values,pos):
    return _easy_array(values,str(pos))

add('curated-linked-list-cycle', 'Linked List Cycle', 'Linked lists', 'Easy',
    'Build a singly linked list from the values. The final node either points to null or points back to a specified node. Determine whether following next links from the head repeats a node.',
    'n and pos, followed by n node values. A pos of -1 leaves the tail pointing to null; otherwise the tail points to the node at zero-based index pos. pos describes the input construction, not a value stored in the list.',
    'Print YES if the list contains a cycle; otherwise print NO.',
    ['0 ≤ n ≤ 200000', '−10^9 ≤ value ≤ 10^9', 'pos is -1 or a valid index from 0 through n−1; pos must be -1 when n=0.'],
    'After constructing the links, use Floyd’s algorithm: move one pointer one link at a time and another two links at a time. A meeting proves a cycle; reaching null proves termination.',
    'O(n) time and O(1) auxiliary space after constructing the input list.',
    ['Repeated values do not imply a cycle; repeated node identities do.', 'Check for null before moving the fast pointer twice.'],
    '''class Node{long value;Node next;Node(long v){value=v;}}int n=f.i(),pos=f.i();Node head=null,tail=null,entry=null;for(int i=0;i<n;i++){Node p=new Node(f.l());if(head==null)head=p;else tail.next=p;tail=p;if(i==pos)entry=p;}if(tail!=null)tail.next=entry;Node slow=head,fast=head;boolean cycle=false;while(fast!=null&&fast.next!=null){slow=slow.next;fast=fast.next.next;if(slow==fast){cycle=true;break;}}System.out.println(cycle?"YES":"NO");''',
    '''struct Node{long long value;Node*next=nullptr;};int n,pos;cin>>n>>pos;Node*head=nullptr,*tail=nullptr,*entry=nullptr;for(int i=0;i<n;i++){long long x;cin>>x;Node*p=new Node{x};if(!head)head=p;else tail->next=p;tail=p;if(i==pos)entry=p;}if(tail)tail->next=entry;Node*slow=head,*fast=head;bool cycle=false;while(fast&&fast->next){slow=slow->next;fast=fast->next->next;if(slow==fast){cycle=true;break;}}cout<<(cycle?"YES":"NO");if(tail)tail->next=nullptr;while(head){Node*next=head->next;delete head;head=next;}''',
    '''class Node:
 def __init__(self,value):self.value=value;self.next=None
n=ni();pos=ni();head=tail=entry=None
for i in range(n):
 p=Node(ni())
 if head is None:head=p
 else:tail.next=p
 tail=p
 if i==pos:entry=p
if tail is not None:tail.next=entry
slow=fast=head;cycle=False
while fast is not None and fast.next is not None:
 slow=slow.next;fast=fast.next.next
 if slow is fast:cycle=True;break
print('YES' if cycle else 'NO')''',
    [_easy_cycle([3,2,0,-4],1), _easy_cycle([1],-1), _easy_cycle([],-1), _easy_cycle([7],0),
     _easy_cycle([2,2,2,2],-1), _easy_cycle([1,2],0), _easy_cycle(list(range(5000)),4999)],
    ['YES','NO'])

# Both tree adapters use compact level order: consume up to two child tokens for
# each non-null node removed from the queue. Omitted trailing children are null.
_easy_tree_input = ('m, followed by m level-order tokens. Each token is an integer or null. '
                    'The first token is the root; then each non-null node in queue order consumes up to two tokens for its left and right children. '
                    'Trailing null children may be omitted. Use m=0 or the single token null for an empty tree.')
_easy_tree_constraints = ['0 ≤ m ≤ 400001; at most 200000 non-null nodes',
                          '−10^9 ≤ node value ≤ 10^9',
                          'Tokens describe a valid tree; there are no tokens after all pending child positions are exhausted.']
_easy_tree_java = '''class Node{long value;Node left,right;Node(long v){value=v;}}
int m=f.i();Node root=null;ArrayDeque<Node> build=new ArrayDeque<>();int consumed=0;
if(m>0){String token=f.next();consumed++;if(!token.equals("null")){root=new Node(Long.parseLong(token));build.add(root);}}
while(!build.isEmpty()&&consumed<m){Node p=build.remove();String token=f.next();consumed++;if(!token.equals("null")){p.left=new Node(Long.parseLong(token));build.add(p.left);}if(consumed<m){token=f.next();consumed++;if(!token.equals("null")){p.right=new Node(Long.parseLong(token));build.add(p.right);}}}
'''
_easy_tree_cpp = '''struct Node{long long value;Node*left=nullptr;Node*right=nullptr;};int m;cin>>m;Node*root=nullptr;queue<Node*>build;vector<Node*>allocated;int consumed=0;
if(m>0){string token;cin>>token;consumed++;if(token!="null"){root=new Node{stoll(token)};build.push(root);allocated.push_back(root);}}
while(!build.empty()&&consumed<m){Node*p=build.front();build.pop();string token;cin>>token;consumed++;if(token!="null"){p->left=new Node{stoll(token)};build.push(p->left);allocated.push_back(p->left);}if(consumed<m){cin>>token;consumed++;if(token!="null"){p->right=new Node{stoll(token)};build.push(p->right);allocated.push_back(p->right);}}}
'''
_easy_tree_python = '''class Node:
 def __init__(self,value):self.value=value;self.left=None;self.right=None
m=ni();root=None;build=deque();consumed=0
if m:
 token=next(data);consumed+=1
 if token!='null':root=Node(int(token));build.append(root)
while build and consumed<m:
 p=build.popleft();token=next(data);consumed+=1
 if token!='null':p.left=Node(int(token));build.append(p.left)
 if consumed<m:
  token=next(data);consumed+=1
  if token!='null':p.right=Node(int(token));build.append(p.right)
'''

def _easy_tree(tokens):
    return str(len(tokens))+'\n'+' '.join(map(str,tokens))+'\n'

add('curated-invert-binary-tree', 'Invert Binary Tree', 'Trees', 'Easy',
    'Mirror a binary tree by swapping the left and right child of every node. Print the mirrored tree in compact level order so that its shape remains visible.',
    _easy_tree_input,
    'Print level-order values with null for missing children, removing all trailing null tokens. Print EMPTY for an empty tree. Do not print a token count.',
    ['0 ≤ m ≤ 6001; at most 3000 non-null nodes']+_easy_tree_constraints[1:],
    'Visit every node with a queue and swap its two child links. Then serialize the mirrored tree with a queue that also records null children, trimming only trailing null markers.',
    'O(n) time and O(n) auxiliary space for queues and serialization, where n is the number of nodes.',
    ['Swap links at every node, including nodes with just one child.', 'Internal null markers are needed to preserve the tree’s shape.'],
    _easy_tree_java+'''ArrayDeque<Node> q=new ArrayDeque<>();if(root!=null)q.add(root);while(!q.isEmpty()){Node p=q.remove();Node temp=p.left;p.left=p.right;p.right=temp;if(p.left!=null)q.add(p.left);if(p.right!=null)q.add(p.right);}if(root==null)System.out.println("EMPTY");else{LinkedList<Node> serial=new LinkedList<>();serial.add(root);ArrayList<String> out=new ArrayList<>();while(!serial.isEmpty()){Node p=serial.remove();if(p==null)out.add("null");else{out.add(Long.toString(p.value));serial.add(p.left);serial.add(p.right);}}while(out.get(out.size()-1).equals("null"))out.remove(out.size()-1);System.out.println(String.join(" ",out));}''',
    _easy_tree_cpp+'''queue<Node*>q;if(root)q.push(root);while(!q.empty()){Node*p=q.front();q.pop();swap(p->left,p->right);if(p->left)q.push(p->left);if(p->right)q.push(p->right);}if(!root)cout<<"EMPTY";else{q.push(root);vector<string>out;while(!q.empty()){Node*p=q.front();q.pop();if(!p)out.push_back("null");else{out.push_back(to_string(p->value));q.push(p->left);q.push(p->right);}}while(out.back()=="null")out.pop_back();for(auto&s:out)cout<<s<<" ";}for(Node*p:allocated)delete p;''',
    _easy_tree_python+'''q=deque([root] if root is not None else [])
while q:
 p=q.popleft();p.left,p.right=p.right,p.left
 if p.left is not None:q.append(p.left)
 if p.right is not None:q.append(p.right)
out=[];q=deque([root] if root is not None else [])
while q:
 p=q.popleft()
 if p is None:out.append('null')
 else:out.append(str(p.value));q.append(p.left);q.append(p.right)
while out and out[-1]=='null':out.pop()
print(' '.join(out) if out else 'EMPTY')''',
    [_easy_tree([4,2,7,1,3,6,9]), _easy_tree([1,2,3,'null',4]), _easy_tree([]),
     _easy_tree(['null']), _easy_tree([8]), _easy_tree([1,'null',2,3]),
     _easy_tree([0]+['null',0]*999)],
    ['4 7 2 9 6 3 1','1 3 2 null null 4'])

add('curated-maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', 'Trees', 'Easy',
    'Find the number of nodes on the longest path from the root to a leaf. The depth of an empty tree is 0, and a tree containing only its root has depth 1.',
    _easy_tree_input, 'Print the maximum depth as an integer.', _easy_tree_constraints,
    'Traverse the tree breadth first. Process one whole queue level at a time and increase the depth after each level. An iterative traversal also handles very deep trees without exhausting the call stack.',
    'O(n) time and O(w) auxiliary traversal space, where w is the maximum width, after constructing the input tree.',
    ['Depth counts nodes, not edges.', 'Remember the current queue size before processing a level.'],
    _easy_tree_java+'''ArrayDeque<Node>q=new ArrayDeque<>();if(root!=null)q.add(root);int depth=0;while(!q.isEmpty()){int size=q.size();for(int i=0;i<size;i++){Node p=q.remove();if(p.left!=null)q.add(p.left);if(p.right!=null)q.add(p.right);}depth++;}System.out.println(depth);''',
    _easy_tree_cpp+'''queue<Node*>q;if(root)q.push(root);int depth=0;while(!q.empty()){int count=(int)q.size();while(count--){Node*p=q.front();q.pop();if(p->left)q.push(p->left);if(p->right)q.push(p->right);}depth++;}cout<<depth;for(Node*p:allocated)delete p;''',
    _easy_tree_python+'''q=deque([root] if root is not None else []);depth=0
while q:
 for _ in range(len(q)):
  p=q.popleft()
  if p.left is not None:q.append(p.left)
  if p.right is not None:q.append(p.right)
 depth+=1
print(depth)''',
    [_easy_tree([3,9,20,'null','null',15,7]), _easy_tree([1,'null',2]), _easy_tree([]),
     _easy_tree(['null']), _easy_tree([5]), _easy_tree([1,2,3,4,5,6,7]),
     _easy_tree([0]+['null',0]*4999)],
    ['3','2'])
