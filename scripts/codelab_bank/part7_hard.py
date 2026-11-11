"""Ten original stdin/stdout adaptations of the requested Hard reference problems."""

add('curated-trapping-rain-water', 'Trapping Rain Water', 'Two pointers', 'Hard',
    'A skyline consists of adjacent unit-width bars. After rain, water stays in gaps bounded by taller bars. Find the total number of unit squares of trapped water; water beyond either end drains away.',
    'An integer n, followed by n nonnegative bar heights. When n is 0 there are no heights.',
    'Print the total trapped water as an integer.',
    ['0 ≤ n ≤ 200000', '0 ≤ height ≤ 1000000000; the answer may require 64-bit arithmetic.'],
    'Move inward from both ends while maintaining the largest height seen on each side. Finalize the side with the smaller current boundary, because the opposite boundary is already high enough to contain its water.',
    'O(n) time and O(1) auxiliary space beyond the input array.',
    ['Water above a bar is limited by the smaller of its left and right maximum heights.', 'Finalize one side at a time; use a 64-bit total.'],
    r'''
    int n=f.i();long[] a=new long[n];for(int i=0;i<n;i++)a[i]=f.l();
    int l=0,r=n-1;long left=0,right=0,water=0;
    while(l<=r){if(left<=right){left=Math.max(left,a[l]);water+=left-a[l++];}
      else{right=Math.max(right,a[r]);water+=right-a[r--];}}
    System.out.println(water);
    ''',
    r'''
    int n;cin>>n;vector<long long>a(n);for(auto&x:a)cin>>x;
    int l=0,r=n-1;long long left=0,right=0,water=0;
    while(l<=r){if(left<=right){left=max(left,a[l]);water+=left-a[l++];}
      else{right=max(right,a[r]);water+=right-a[r--];}}
    cout<<water;
    ''',
    '''
    n=ni();a=[ni() for _ in range(n)];l=0;r=n-1;left=right=water=0
    while l<=r:
        if left<=right:
            left=max(left,a[l]);water+=left-a[l];l+=1
        else:
            right=max(right,a[r]);water+=right-a[r];r-=1
    print(water)
    ''',
    ['12\n0 1 0 2 1 0 1 3 2 1 2 1\n', '6\n4 2 0 3 2 5\n',
     '0\n', '1\n8\n', '5\n1 2 3 4 5\n', '5\n5 4 3 2 1\n',
     '5\n3 3 3 3 3\n', '5\n1000000000 0 0 0 1000000000\n',
     '20000\n'+' '.join(['1000000000']+['0']*19998+['1000000000'])+'\n'], ['6', '9'])

add('curated-merge-k-sorted-lists', 'Merge k Sorted Lists', 'Linked lists', 'Hard',
    'You receive k singly linked lists, each already sorted in nondecreasing order. Merge their nodes into one sorted list, preserving every occurrence of every value. A list, or the entire collection, may be empty.',
    'First k. For each list: its length followed by that many integer node values, in list order. Whitespace and line breaks are interchangeable.',
    'Print the merged values separated by spaces. Print an empty line when there are no nodes.',
    ['0 ≤ k ≤ 1000', '0 ≤ total number N of nodes ≤ 4000', '−1000000000 ≤ value ≤ 1000000000', 'Each input list is sorted in nondecreasing order.'],
    'Put each nonempty list head into a min-heap. Repeatedly remove the smallest node, attach it to the output, and add its original successor to the heap. There is at most one heap entry per input list.',
    'O(k + N log(k+1)) time and O(k) auxiliary space beyond the linked nodes and printed output.',
    ['The next output node must be one of the current list heads.', 'After removing a heap node, offer its successor; retain duplicate values.'],
    r'''
    class Node{long v;Node next;Node(long x){v=x;}}
    int k=f.i();PriorityQueue<Node> heap=new PriorityQueue<>(Comparator.comparingLong(x->x.v));
    for(int i=0;i<k;i++){int n=f.i();Node head=null,tail=null;
      for(int j=0;j<n;j++){Node p=new Node(f.l());if(head==null)head=p;else tail.next=p;tail=p;}
      if(head!=null)heap.add(head);}
    Node dummy=new Node(0),tail=dummy;
    while(!heap.isEmpty()){Node p=heap.remove();if(p.next!=null)heap.add(p.next);tail.next=p;tail=p;}
    tail.next=null;StringBuilder out=new StringBuilder();
    for(Node p=dummy.next;p!=null;p=p.next)out.append(p.v).append(' ');
    System.out.println(out);
    ''',
    r'''
    struct Node{long long v;Node*next=nullptr;};
    auto cmp=[](Node*a,Node*b){return a->v>b->v;};
    priority_queue<Node*,vector<Node*>,decltype(cmp)>heap(cmp);
    int k;cin>>k;for(int i=0;i<k;i++){int n;cin>>n;Node*head=nullptr,*tail=nullptr;
      while(n--){long long x;cin>>x;Node*p=new Node{x};if(!head)head=p;else tail->next=p;tail=p;}
      if(head)heap.push(head);}
    Node dummy{0};Node*tail=&dummy;
    while(!heap.empty()){Node*p=heap.top();heap.pop();if(p->next)heap.push(p->next);tail->next=p;tail=p;}
    tail->next=nullptr;
    while(dummy.next){Node*p=dummy.next;cout<<p->v<<' ';dummy.next=p->next;delete p;}
    cout<<'\n';
    ''',
    '''
    class Node:
        def __init__(self,v):self.v=v;self.next=None
    k=ni();heap=[]
    for i in range(k):
        n=ni();head=tail=None
        for _ in range(n):
            p=Node(ni())
            if head is None:head=p
            else:tail.next=p
            tail=p
        if head is not None:heappush(heap,(head.v,i,head))
    dummy=Node(0);tail=dummy
    while heap:
        _,i,p=heappop(heap)
        if p.next is not None:heappush(heap,(p.next.v,i,p.next))
        tail.next=p;tail=p
    tail.next=None;out=[];p=dummy.next
    while p is not None:out.append(str(p.v));p=p.next
    print(' '.join(out))
    ''',
    ['3\n3 1 4 5\n3 1 3 4\n2 2 6\n', '3\n0\n2 -3 7\n1 0\n',
     '0\n', '4\n0\n0\n0\n0\n', '1\n1 42\n',
     '3\n3 2 2 2\n2 2 2\n1 2\n',
     '2\n2 -1000000000 1000000000\n2 -1000000000 1000000000\n',
     '1000\n'+'\n'.join('4 '+' '.join(str(i+j*1000) for j in range(4)) for i in range(1000))+'\n'],
    ['1 1 2 3 4 4 5 6', '-3 0 7'])

add('curated-reverse-nodes-in-k-group', 'Reverse Nodes in k-Group', 'Linked lists', 'Hard',
    'Reverse a singly linked list in consecutive groups of exactly k nodes. Any final group with fewer than k nodes keeps its original order. Solve by changing links rather than swapping node values.',
    'n and k, followed by n integer node values in list order.',
    'Print the values after the group reversals, separated by spaces; use an empty line for an empty list.',
    ['0 ≤ n ≤ 4000', '1 ≤ k ≤ 4001', '−1000000000 ≤ value ≤ 1000000000'],
    'Use a dummy head and locate the kth node after the previous group. If it exists, reverse exactly that segment toward the following node, reconnect the segment, and advance. Stop when a complete group is unavailable.',
    'O(n) time and O(1) auxiliary space beyond the linked nodes and printed output.',
    ['Check that a full group exists before changing any links.', 'The old first node becomes the last node of a reversed group.'],
    r'''
    class Node{long v;Node next;Node(long x){v=x;}}
    int n=f.i(),k=f.i();Node dummy=new Node(0),tail=dummy;
    for(int i=0;i<n;i++){tail.next=new Node(f.l());tail=tail.next;}
    Node before=dummy;
    while(true){Node kth=before;for(int j=0;j<k&&kth!=null;j++)kth=kth.next;if(kth==null)break;
      Node after=kth.next,oldFirst=before.next,prev=after,cur=oldFirst;
      while(cur!=after){Node next=cur.next;cur.next=prev;prev=cur;cur=next;}
      before.next=kth;before=oldFirst;}
    StringBuilder out=new StringBuilder();for(Node p=dummy.next;p!=null;p=p.next)out.append(p.v).append(' ');
    System.out.println(out);
    ''',
    r'''
    struct Node{long long v;Node*next=nullptr;};int n,k;cin>>n>>k;
    Node dummy{0};Node*tail=&dummy;while(n--){long long x;cin>>x;tail->next=new Node{x};tail=tail->next;}
    Node*before=&dummy;
    while(true){Node*kth=before;for(int j=0;j<k&&kth;j++)kth=kth->next;if(!kth)break;
      Node*after=kth->next,*oldFirst=before->next,*prev=after,*cur=oldFirst;
      while(cur!=after){Node*next=cur->next;cur->next=prev;prev=cur;cur=next;}
      before->next=kth;before=oldFirst;}
    while(dummy.next){Node*p=dummy.next;cout<<p->v<<' ';dummy.next=p->next;delete p;}cout<<'\n';
    ''',
    '''
    class Node:
        def __init__(self,v):self.v=v;self.next=None
    n=ni();k=ni();dummy=Node(0);tail=dummy
    for _ in range(n):tail.next=Node(ni());tail=tail.next
    before=dummy
    while True:
        kth=before
        for _ in range(k):
            kth=kth.next
            if kth is None:break
        if kth is None:break
        after=kth.next;old_first=before.next;prev=after;cur=old_first
        while cur is not after:
            nxt=cur.next;cur.next=prev;prev=cur;cur=nxt
        before.next=kth;before=old_first
    out=[];p=dummy.next
    while p is not None:out.append(str(p.v));p=p.next
    print(' '.join(out))
    ''',
    ['5 2\n1 2 3 4 5\n', '5 3\n1 2 3 4 5\n', '0 2\n', '1 1\n7\n',
     '4 5\n1 2 3 4\n', '4 4\n1 2 3 4\n', '6 2\n0 -1 -1 8 0 8\n',
     '4000 3\n'+' '.join(map(str,range(4000)))+'\n'], ['2 1 4 3 5', '3 2 1 4 5'])

add('curated-minimum-window-substring', 'Minimum Window Substring', 'Sliding window', 'Hard',
    'Find the shortest contiguous substring of s containing every character of t with at least its required multiplicity. Matching is case-sensitive. If several shortest windows exist, choose the one that starts earliest. An empty target requires the empty window.',
    'Two whitespace-separated strings s and t. Each consists of English letters; the single token - represents an empty string.',
    'Print the selected substring. Print EMPTY for an empty target, or NONE if a nonempty target cannot be covered.',
    ['0 ≤ |s|, |t| ≤ 20000', 'Nonempty strings contain only A–Z and a–z.'],
    'Maintain required character counts and a count of still-missing occurrences. Expand the right edge until the window covers t, then shrink from the left while coverage holds. Update the answer only on a strictly shorter window to preserve the earliest tie.',
    'O(|s|+|t|) time and O(1) auxiliary space for the fixed alphabet.',
    ['Repeated characters in t require repeated occurrences in the window.', 'A negative remaining count means that character is currently present in excess.'],
    r'''
    String s=f.next(),t=f.next();if(s.equals("-"))s="";if(t.equals("-"))t="";
    if(t.isEmpty()){System.out.println("EMPTY");return;}
    int[]need=new int[128];for(char ch:t.toCharArray())need[ch]++;
    int missing=t.length(),left=0,bestStart=0,best=s.length()+1;
    for(int right=0;right<s.length();right++){
      char ch=s.charAt(right);if(need[ch]>0)missing--;need[ch]--;
      while(missing==0){if(right-left+1<best){best=right-left+1;bestStart=left;}
        char old=s.charAt(left++);if(++need[old]>0)missing++;}}
    System.out.println(best>s.length()?"NONE":s.substring(bestStart,bestStart+best));
    ''',
    r'''
    string s,t;cin>>s>>t;if(s=="-")s="";if(t=="-")t="";
    if(t.empty()){cout<<"EMPTY";return 0;}
    int need[128]={};for(char ch:t)need[(int)ch]++;
    int missing=t.size(),left=0,bestStart=0,best=s.size()+1;
    for(int right=0;right<(int)s.size();right++){
      char ch=s[right];if(need[(int)ch]>0)missing--;need[(int)ch]--;
      while(missing==0){if(right-left+1<best){best=right-left+1;bestStart=left;}
        char old=s[left++];if(++need[(int)old]>0)missing++;}}
    cout<<(best>(int)s.size()?"NONE":s.substr(bestStart,best));
    ''',
    '''
    s=next(data);t=next(data);s='' if s=='-' else s;t='' if t=='-' else t
    if not t:print('EMPTY')
    else:
        need=Counter(t);missing=len(t);left=0;best_start=0;best=len(s)+1
        for right,ch in enumerate(s):
            if need[ch]>0:missing-=1
            need[ch]-=1
            while missing==0:
                if right-left+1<best:best=right-left+1;best_start=left
                old=s[left];left+=1;need[old]+=1
                if need[old]>0:missing+=1
        print('NONE' if best>len(s) else s[best_start:best_start+best])
    ''',
    ['ADOBECODEBANC ABC\n', 'AAABBC AABC\n', '- A\n', 'ABC -\n', '- -\n',
     'a aa\n', 'abxba ab\n', 'aaA Aa\n', 'abc z\n',
     'A'+'x'*19998+'B AB\n'], ['BANC', 'AABBC'])

add('curated-largest-rectangle-in-histogram', 'Largest Rectangle in Histogram', 'Stacks', 'Hard',
    'A histogram contains adjacent unit-width bars. Choose consecutive bars and a rectangle whose height does not exceed any chosen bar. Find the largest possible rectangle area. An empty histogram has area 0.',
    'n, followed by n nonnegative bar heights.', 'Print the maximum rectangle area as an integer.',
    ['0 ≤ n ≤ 200000', '0 ≤ height ≤ 1000000000; use 64-bit arithmetic for areas.'],
    'Maintain a stack of indices with nondecreasing heights. When a shorter bar arrives, pop taller bars and compute their largest span using the new stack top as the left boundary. A final zero-height sentinel flushes all remaining positive bars.',
    'O(n) time and O(n) auxiliary space.',
    ['Each bar can be the limiting height of a rectangle.', 'After a pop, the span ends just before the current bar and begins just after the new stack top.'],
    r'''
    int n=f.i();long[]a=new long[n+1];for(int i=0;i<n;i++)a[i]=f.l();
    int[]stack=new int[n+1];int top=0;long best=0;
    for(int i=0;i<=n;i++){
      while(top>0&&a[stack[top-1]]>a[i]){long h=a[stack[--top]];int left=top==0?-1:stack[top-1];best=Math.max(best,h*(i-left-1));}
      stack[top++]=i;}
    System.out.println(best);
    ''',
    r'''
    int n;cin>>n;vector<long long>a(n+1);for(int i=0;i<n;i++)cin>>a[i];vector<int>st;long long best=0;
    for(int i=0;i<=n;i++){
      while(!st.empty()&&a[st.back()]>a[i]){long long h=a[st.back()];st.pop_back();int left=st.empty()?-1:st.back();best=max(best,h*(i-left-1));}
      st.push_back(i);}
    cout<<best;
    ''',
    '''
    n=ni();a=[ni() for _ in range(n)]+[0];stack=[];best=0
    for i in range(n+1):
        while stack and a[stack[-1]]>a[i]:
            h=a[stack.pop()];left=stack[-1] if stack else -1
            best=max(best,h*(i-left-1))
        stack.append(i)
    print(best)
    ''',
    ['6\n2 1 5 6 2 3\n', '2\n2 4\n', '0\n', '1\n0\n', '5\n3 3 3 3 3\n',
     '5\n1 2 3 4 5\n', '5\n5 4 3 2 1\n', '5\n2 0 2 2 0\n',
     '20000\n'+' '.join(['1000000000']*20000)+'\n'], ['10', '4'])

add('curated-binary-tree-maximum-path-sum', 'Binary Tree Maximum Path Sum', 'Trees', 'Hard',
    'A path in a binary tree follows edges between distinct nodes without revisiting a node. It may start and end anywhere and must contain at least one node. Find the largest sum of node values along any path.',
    'A token count m, followed by m compact level-order tokens. A token is an integer value or null for an absent child. Start with the root, then consume the left and right child tokens for each non-null node in queue order; omitted trailing child tokens are null. The tree is valid and nonempty.',
    'Print the largest path sum as an integer.',
    ['1 ≤ number of non-null nodes ≤ 200000', '1 ≤ m ≤ 400001', '−1000000000 ≤ node value ≤ 1000000000; sums require 64-bit arithmetic.'],
    'Build child indices in breadth-first order, then process nodes in reverse creation order so children are ready before parents. The gain offered to a parent uses at most one child; the best path centered at a node may use both positive child gains.',
    'O(m) time and O(m) space, with no recursive calls.',
    ['Discard a negative child gain when extending a path.', 'Initialize the global answer below all possible node values so all-negative trees work.'],
    r'''
    int m=f.i();String[]tok=new String[m];for(int i=0;i<m;i++)tok[i]=f.next();
    long[]val=new long[m],gain=new long[m];int[]left=new int[m],right=new int[m];Arrays.fill(left,-1);Arrays.fill(right,-1);
    int size=1,pos=1;val[0]=Long.parseLong(tok[0]);
    for(int p=0;p<size&&pos<m;p++)for(int side=0;side<2&&pos<m;side++){
      String s=tok[pos++];if(!s.equals("null")){int child=size++;val[child]=Long.parseLong(s);if(side==0)left[p]=child;else right[p]=child;}}
    long best=Long.MIN_VALUE;
    for(int p=size-1;p>=0;p--){long a=left[p]<0?0:Math.max(0,gain[left[p]]),b=right[p]<0?0:Math.max(0,gain[right[p]]);
      best=Math.max(best,val[p]+a+b);gain[p]=val[p]+Math.max(a,b);}
    System.out.println(best);
    ''',
    r'''
    int m;cin>>m;vector<string>tok(m);for(auto&s:tok)cin>>s;
    vector<long long>val(m),gain(m);vector<int>left(m,-1),right(m,-1);int size=1,pos=1;val[0]=stoll(tok[0]);
    for(int p=0;p<size&&pos<m;p++)for(int side=0;side<2&&pos<m;side++){
      string s=tok[pos++];if(s!="null"){int child=size++;val[child]=stoll(s);if(side==0)left[p]=child;else right[p]=child;}}
    long long best=LLONG_MIN;
    for(int p=size-1;p>=0;p--){long long a=left[p]<0?0:max(0LL,gain[left[p]]),b=right[p]<0?0:max(0LL,gain[right[p]]);
      best=max(best,val[p]+a+b);gain[p]=val[p]+max(a,b);}
    cout<<best;
    ''',
    '''
    m=ni();tok=[next(data) for _ in range(m)];val=[int(tok[0])];left=[-1];right=[-1];pos=1;p=0
    while p<len(val) and pos<m:
        for side in range(2):
            if pos==m:break
            s=tok[pos];pos+=1
            if s!='null':
                child=len(val);val.append(int(s));left.append(-1);right.append(-1)
                if side==0:left[p]=child
                else:right[p]=child
        p+=1
    gain=[0]*len(val);best=-10**30
    for p in range(len(val)-1,-1,-1):
        a=max(0,gain[left[p]]) if left[p]>=0 else 0
        b=max(0,gain[right[p]]) if right[p]>=0 else 0
        best=max(best,val[p]+a+b);gain[p]=val[p]+max(a,b)
    print(best)
    ''',
    ['7\n-10 9 20 null null 15 7\n', '3\n-3 -2 -5\n', '1\n0\n', '1\n-1000000000\n',
     '7\n1 2 3 4 5 6 7\n', '7\n1 -2 -3 4 5 null 6\n', '3\n1000000000 1000000000 1000000000\n',
     '23999\n'+' null '.join(['1']*12000)+'\n'], ['42', '-2'])

add('curated-serialize-and-deserialize-binary-tree', 'Serialize and Deserialize Binary Tree', 'Trees', 'Hard',
    'Implement a deterministic binary-tree codec in both directions. SERIALIZE converts a compact level-order tree into a complete preorder stream: emit the node value, then its left subtree, then its right subtree; emit null for every absent child. DESERIALIZE reconstructs a tree from that complete preorder stream and outputs its compact level-order representation, removing all trailing null tokens. The empty tree is represented by the single token null in both formats. Integer values must be printed in ordinary decimal notation.',
    'An operation SERIALIZE or DESERIALIZE, then token count m, then m tokens (integer values or null). For SERIALIZE, tokens are compact level order: root first, then left and right children of each non-null node in queue order; omitted trailing children are null. For DESERIALIZE, tokens are a valid complete preorder stream with explicit null children. All inputs describe valid trees.',
    'Print the output token count on the first line and the output tokens separated by spaces on the second line. SERIALIZE outputs complete preorder; DESERIALIZE outputs compact level order with trailing nulls removed, or one null for the empty tree.',
    ['0 ≤ number of non-null nodes ≤ 1500', '1 ≤ m ≤ 3001', '−1000000000 ≤ value ≤ 1000000000', 'A complete preorder stream for n nodes contains exactly 2n+1 tokens.'],
    'For level-order input, attach children using a queue. For preorder input, use a stack of pending left/right child slots so every null fixes an exact missing edge. Serialize with an iterative preorder stack including null entries. To emit level order after deserialization, queue child slots and trim only the trailing nulls.',
    'O(m) time and O(m) space, using iterative traversals that also handle very deep trees.',
    ['A list of only node values cannot distinguish different tree shapes.', 'Preorder parsing must consume a null token without creating a node.', 'The two operations have different traversal orders; copying or merely trimming the input is insufficient.'],
    r'''
    String op=f.next();int m=f.i();String[]tok=new String[m];for(int i=0;i<m;i++)tok[i]=f.next();
    long[]val=new long[m];int[]left=new int[m],right=new int[m];Arrays.fill(left,-1);Arrays.fill(right,-1);
    int size=0,root=-1;
    if(!tok[0].equals("null")){root=0;size=1;val[0]=Long.parseLong(tok[0]);
      if(op.equals("SERIALIZE")){int pos=1;
        for(int p=0;p<size&&pos<m;p++)for(int side=0;side<2&&pos<m;side++){
          String s=tok[pos++];if(!s.equals("null")){int child=size++;val[child]=Long.parseLong(s);if(side==0)left[p]=child;else right[p]=child;}}}
      else{ArrayDeque<Integer>slots=new ArrayDeque<>();slots.push(1);slots.push(0);
        for(int pos=1;pos<m;pos++){int slot=slots.pop(),p=slot/2;String s=tok[pos];
          if(!s.equals("null")){int child=size++;val[child]=Long.parseLong(s);if(slot%2==0)left[p]=child;else right[p]=child;
            slots.push(child*2+1);slots.push(child*2);}}}}
    ArrayList<String>out=new ArrayList<>();ArrayDeque<Integer>work=new ArrayDeque<>();work.add(root);
    if(op.equals("SERIALIZE")){
      while(!work.isEmpty()){int p=work.removeLast();if(p<0)out.add("null");else{out.add(Long.toString(val[p]));work.addLast(right[p]);work.addLast(left[p]);}}}
    else{
      while(!work.isEmpty()){int p=work.removeFirst();if(p<0)out.add("null");else{out.add(Long.toString(val[p]));work.addLast(left[p]);work.addLast(right[p]);}}
      while(out.size()>1&&out.get(out.size()-1).equals("null"))out.remove(out.size()-1);}
    System.out.println(out.size());System.out.println(String.join(" ",out));
    ''',
    r'''
    string op;int m;cin>>op>>m;vector<string>tok(m);for(auto&s:tok)cin>>s;
    vector<long long>val(m);vector<int>left(m,-1),right(m,-1);int size=0,root=-1;
    if(tok[0]!="null"){root=0;size=1;val[0]=stoll(tok[0]);
      if(op=="SERIALIZE"){int pos=1;
        for(int p=0;p<size&&pos<m;p++)for(int side=0;side<2&&pos<m;side++){
          string s=tok[pos++];if(s!="null"){int child=size++;val[child]=stoll(s);if(side==0)left[p]=child;else right[p]=child;}}}
      else{vector<int>slots{1,0};
        for(int pos=1;pos<m;pos++){int slot=slots.back();slots.pop_back();int p=slot/2;string s=tok[pos];
          if(s!="null"){int child=size++;val[child]=stoll(s);if(slot%2==0)left[p]=child;else right[p]=child;
            slots.push_back(child*2+1);slots.push_back(child*2);}}}}
    vector<string>out;deque<int>work{root};
    if(op=="SERIALIZE"){
      while(!work.empty()){int p=work.back();work.pop_back();if(p<0)out.push_back("null");else{out.push_back(to_string(val[p]));work.push_back(right[p]);work.push_back(left[p]);}}}
    else{
      while(!work.empty()){int p=work.front();work.pop_front();if(p<0)out.push_back("null");else{out.push_back(to_string(val[p]));work.push_back(left[p]);work.push_back(right[p]);}}
      while(out.size()>1&&out.back()=="null")out.pop_back();}
    cout<<out.size()<<'\n';for(auto&s:out)cout<<s<<' ';cout<<'\n';
    ''',
    '''
    op=next(data);m=ni();tok=[next(data) for _ in range(m)];val=[];left=[];right=[];root=-1
    if tok[0]!='null':
        root=0;val.append(int(tok[0]));left.append(-1);right.append(-1)
        if op=='SERIALIZE':
            pos=1;p=0
            while p<len(val) and pos<m:
                for side in range(2):
                    if pos==m:break
                    s=tok[pos];pos+=1
                    if s!='null':
                        child=len(val);val.append(int(s));left.append(-1);right.append(-1)
                        if side==0:left[p]=child
                        else:right[p]=child
                p+=1
        else:
            slots=[1,0]
            for s in tok[1:]:
                slot=slots.pop();p=slot//2
                if s!='null':
                    child=len(val);val.append(int(s));left.append(-1);right.append(-1)
                    if slot%2==0:left[p]=child
                    else:right[p]=child
                    slots.extend((child*2+1,child*2))
    out=[];work=deque([root])
    if op=='SERIALIZE':
        while work:
            p=work.pop()
            if p<0:out.append('null')
            else:out.append(str(val[p]));work.extend((right[p],left[p]))
    else:
        while work:
            p=work.popleft()
            if p<0:out.append('null')
            else:out.append(str(val[p]));work.extend((left[p],right[p]))
        while len(out)>1 and out[-1]=='null':out.pop()
    print(len(out));print(' '.join(out))
    ''',
    ['SERIALIZE 7\n1 2 3 null null 4 5\n',
     'DESERIALIZE 11\n1 2 null null 3 4 null null 5 null null\n',
     'SERIALIZE 1\nnull\n', 'DESERIALIZE 1\nnull\n',
     'SERIALIZE 3\n-7 null null\n', 'DESERIALIZE 3\n-7 null null\n',
     'SERIALIZE 5\n1 null 2 3 null\n', 'DESERIALIZE 7\n1 null 2 3 null null null\n',
     'SERIALIZE 3\n0 0 0\n',
     'SERIALIZE 2999\n'+' null '.join(['1000000000']*1500)+'\n',
     'DESERIALIZE 3001\n'+' '.join(['-1000000000']*1500+['null']*1501)+'\n'],
    ['11\n1 2 null null 3 4 null null 5 null null', '7\n1 2 3 null null 4 5'])

add('curated-word-search-ii', 'Word Search II', 'Tries and backtracking', 'Hard',
    'Find every dictionary word that can be traced on a rectangular letter board. Consecutive letters must use cells sharing an edge, and a cell cannot be reused within one word. Return each found word once, even if the dictionary repeats it or several board paths spell it.',
    'r and c, followed by r lowercase strings of length c. Then w, followed by w nonempty lowercase dictionary words.',
    'Print all distinct found words separated by whitespace, in any order. If none are found, print an empty line.',
    ['1 ≤ r,c ≤ 12', '0 ≤ w ≤ 2000', '1 ≤ word length ≤ 10', 'The sum S of dictionary word lengths is at most 20000.'],
    'Store dictionary words in a trie. Start a depth-first search at each board cell and follow only trie edges matching adjacent cells. Temporarily mark each visited cell, restore it on return, and clear a terminal word after reporting it to prevent duplicates.',
    'O(S + r·c·4·3^(L−1)) worst-case time and O(S+L) auxiliary space, where L is the maximum word length (take L=1 for an empty dictionary). Trie pruning often makes the search much smaller.',
    ['Share searches for words with a common prefix using a trie.', 'Restore the board cell after exploring a path.', 'Finding a shorter word must not stop the search for longer words sharing its prefix.'],
    r'''
    int r=f.i(),c=f.i();char[][]board=new char[r][];for(int i=0;i<r;i++)board[i]=f.next().toCharArray();
    class Trie{Trie[]next=new Trie[26];String word;}
    Trie root=new Trie();int w=f.i();for(int i=0;i<w;i++){String word=f.next();Trie p=root;
      for(char ch:word.toCharArray()){int x=ch-'a';if(p.next[x]==null)p.next[x]=new Trie();p=p.next[x];}p.word=word;}
    ArrayList<String>out=new ArrayList<>();
    class Search{void dfs(int row,int col,Trie parent){
      if(row<0||row>=r||col<0||col>=c||board[row][col]=='#')return;
      char ch=board[row][col];Trie node=parent.next[ch-'a'];if(node==null)return;
      if(node.word!=null){out.add(node.word);node.word=null;}
      board[row][col]='#';dfs(row+1,col,node);dfs(row-1,col,node);dfs(row,col+1,node);dfs(row,col-1,node);board[row][col]=ch;
    }}
    Search search=new Search();for(int i=0;i<r;i++)for(int j=0;j<c;j++)search.dfs(i,j,root);
    System.out.println(String.join(" ",out));
    ''',
    r'''
    int r,c;cin>>r>>c;vector<string>board(r);for(auto&s:board)cin>>s;
    struct Trie{int next[26];string word;Trie(){fill(next,next+26,-1);}};
    vector<Trie>trie(1);int w;cin>>w;
    while(w--){string word;cin>>word;int p=0;for(char ch:word){int x=ch-'a';if(trie[p].next[x]<0){int child=trie.size();trie[p].next[x]=child;trie.emplace_back();}p=trie[p].next[x];}trie[p].word=word;}
    vector<string>out;
    function<void(int,int,int)>dfs=[&](int row,int col,int parent){
      if(row<0||row>=r||col<0||col>=c||board[row][col]=='#')return;
      char ch=board[row][col];int node=trie[parent].next[ch-'a'];if(node<0)return;
      if(!trie[node].word.empty()){out.push_back(trie[node].word);trie[node].word.clear();}
      board[row][col]='#';dfs(row+1,col,node);dfs(row-1,col,node);dfs(row,col+1,node);dfs(row,col-1,node);board[row][col]=ch;
    };
    for(int i=0;i<r;i++)for(int j=0;j<c;j++)dfs(i,j,0);
    for(auto&s:out)cout<<s<<' ';cout<<'\n';
    ''',
    '''
    r=ni();c=ni();board=[list(next(data)) for _ in range(r)];w=ni();root={}
    for _ in range(w):
        word=next(data);p=root
        for ch in word:p=p.setdefault(ch,{})
        p['word']=word
    out=[]
    def dfs(row,col,parent):
        if not (0<=row<r and 0<=col<c):return
        ch=board[row][col]
        if ch=='#' or ch not in parent:return
        node=parent[ch]
        if 'word' in node:out.append(node.pop('word'))
        board[row][col]='#'
        dfs(row+1,col,node);dfs(row-1,col,node);dfs(row,col+1,node);dfs(row,col-1,node)
        board[row][col]=ch
    for i in range(r):
        for j in range(c):dfs(i,j,root)
    print(' '.join(out))
    ''',
    ['4 4\noaan\netae\nihkr\niflv\n4\noath pea eat rain\n', '2 2\nab\ncd\n4\nab ac ad abca\n',
     '1 1\na\n4\na aa a b\n', '1 2\nab\n2\naba bab\n', '1 3\nabc\n4\na ab abc ab\n',
     '2 2\naa\naa\n5\na aa aaa aaaa aaaaa\n', '1 1\nz\n0\n',
     '12 12\n'+'\n'.join(['abcdefghijkl']*12)+'\n2000\n'+' '.join(['abcdefghij','zzzzzzzzzz']*1000)+'\n'],
    ['oath eat', 'ac ab'], checker='TOKEN_MULTISET')

add('curated-sliding-window-maximum', 'Sliding Window Maximum', 'Deques', 'Hard',
    'Move a window of exactly k consecutive values from left to right across an array. For each window position, report its largest value.',
    'n and k, followed by n integer array values.', 'Print the n−k+1 window maxima in left-to-right order.',
    ['1 ≤ n ≤ 4000', '1 ≤ k ≤ n', '−1000000000 ≤ value ≤ 1000000000'],
    'Maintain a deque of indices whose values decrease from front to back. Remove indices outside the current window and discard smaller or equal values from the back before adding the new index. The front is the maximum.',
    'O(n) time and O(k) auxiliary space beyond the input and output.',
    ['Store indices, since you must know when a candidate expires.', 'A newer value at least as large makes an older candidate unnecessary.'],
    r'''
    int n=f.i(),k=f.i();long[]a=new long[n];for(int i=0;i<n;i++)a[i]=f.l();
    ArrayDeque<Integer>q=new ArrayDeque<>();StringBuilder out=new StringBuilder();
    for(int i=0;i<n;i++){while(!q.isEmpty()&&q.peekFirst()<=i-k)q.removeFirst();
      while(!q.isEmpty()&&a[q.peekLast()]<=a[i])q.removeLast();q.addLast(i);
      if(i>=k-1)out.append(a[q.peekFirst()]).append(' ');}
    System.out.println(out);
    ''',
    r'''
    int n,k;cin>>n>>k;vector<long long>a(n);for(auto&x:a)cin>>x;deque<int>q;
    for(int i=0;i<n;i++){while(!q.empty()&&q.front()<=i-k)q.pop_front();
      while(!q.empty()&&a[q.back()]<=a[i])q.pop_back();q.push_back(i);
      if(i>=k-1)cout<<a[q.front()]<<' ';}
    cout<<'\n';
    ''',
    '''
    n=ni();k=ni();a=[ni() for _ in range(n)];q=deque();out=[]
    for i,x in enumerate(a):
        while q and q[0]<=i-k:q.popleft()
        while q and a[q[-1]]<=x:q.pop()
        q.append(i)
        if i>=k-1:out.append(str(a[q[0]]))
    print(' '.join(out))
    ''',
    ['8 3\n1 3 -1 -3 5 3 6 7\n', '5 2\n9 7 5 3 1\n', '1 1\n-8\n',
     '4 1\n-1 0 -2 8\n', '4 4\n-9 -2 -7 -4\n', '5 3\n7 7 7 7 7\n',
     '5 2\n1000000000 -1000000000 -1000000000 1000000000 0\n',
     '4000 137\n'+' '.join(str((i*71)%997-498) for i in range(4000))+'\n'],
    ['3 3 5 5 6 7', '9 7 5 3'])

add('curated-find-median-from-data-stream', 'Find Median from Data Stream', 'Heaps', 'Hard',
    'Maintain a growing multiset of integers. ADD x inserts x, including duplicates. MEDIAN asks for the middle value after sorting, or the arithmetic mean of the two middle values when the size is even. Answer every query without sorting the entire stream again.',
    'q, followed by q operations: ADD x or MEDIAN. Every MEDIAN occurs after at least one ADD.',
    'For each MEDIAN, print one line with exactly one decimal digit: .0 for an integer or .5 for a half-integer. Negative halves must retain their sign, such as -0.5.',
    ['1 ≤ q ≤ 8000', '−1000000000 ≤ x ≤ 1000000000', 'At most 4000 MEDIAN queries.'],
    'Keep the lower half in a max-heap and the upper half in a min-heap. Rebalance so the lower heap has the same size as the upper heap or one extra item. The median comes from the heap tops. Format twice the median as an integer to avoid floating-point or negative-rounding mistakes.',
    'O(log q) time per ADD, O(1) per MEDIAN, and O(q) space.',
    ['All values in the lower heap must be at most all values in the upper heap.', 'For an even count, add the two middle values using 64-bit arithmetic.', 'Format the sign separately from the absolute doubled median.'],
    r'''
    int q=f.i();PriorityQueue<Long>low=new PriorityQueue<>(Comparator.reverseOrder()),high=new PriorityQueue<>();
    StringBuilder out=new StringBuilder();
    while(q-->0){String op=f.next();if(op.equals("ADD")){long x=f.l();
      if(low.isEmpty()||x<=low.peek())low.add(x);else high.add(x);
      if(low.size()>high.size()+1)high.add(low.remove());else if(high.size()>low.size())low.add(high.remove());}
      else{long twice=low.size()>high.size()?2*low.peek():low.peek()+high.peek(),mag=Math.abs(twice);
        if(twice<0)out.append('-');out.append(mag/2).append(mag%2==0?".0":".5").append('\n');}}
    System.out.print(out);
    ''',
    r'''
    int q;cin>>q;priority_queue<long long>low;priority_queue<long long,vector<long long>,greater<long long>>high;
    while(q--){string op;cin>>op;if(op=="ADD"){long long x;cin>>x;
      if(low.empty()||x<=low.top())low.push(x);else high.push(x);
      if(low.size()>high.size()+1){high.push(low.top());low.pop();}else if(high.size()>low.size()){low.push(high.top());high.pop();}}
      else{long long twice=low.size()>high.size()?2*low.top():low.top()+high.top(),mag=twice<0?-twice:twice;
        if(twice<0)cout<<'-';cout<<mag/2<<(mag%2==0?".0":".5")<<'\n';}}
    ''',
    '''
    q=ni();low=[];high=[];out=[]
    for _ in range(q):
        op=next(data)
        if op=='ADD':
            x=ni()
            if not low or x<=-low[0]:heappush(low,-x)
            else:heappush(high,x)
            if len(low)>len(high)+1:heappush(high,-heappop(low))
            elif len(high)>len(low):heappush(low,-heappop(high))
        else:
            twice=-2*low[0] if len(low)>len(high) else -low[0]+high[0];mag=abs(twice)
            out.append(('-' if twice<0 else '')+str(mag//2)+('.5' if mag%2 else '.0'))
    print('\\n'.join(out))
    ''',
    ['6\nADD 1\nADD 2\nMEDIAN\nADD 3\nMEDIAN\nMEDIAN\n',
     '5\nADD -1\nMEDIAN\nADD 0\nMEDIAN\nMEDIAN\n',
     '1\nADD 8\n', '4\nADD 5\nADD 5\nADD 5\nMEDIAN\n',
     '5\nADD 1000000000\nADD 1000000000\nMEDIAN\nADD -1000000000\nMEDIAN\n',
     '4\nADD -1000000000\nADD 1000000000\nMEDIAN\nMEDIAN\n',
     '8\nADD -5\nADD -2\nMEDIAN\nADD -9\nMEDIAN\nADD 10\nMEDIAN\nMEDIAN\n',
     '8000\n'+'\n'.join('ADD '+str((i*7919)%2000000001-1000000000)+'\nMEDIAN' for i in range(4000))+'\n'],
    ['1.5\n2.0\n2.0', '-1.0\n-0.5\n-0.5'])
