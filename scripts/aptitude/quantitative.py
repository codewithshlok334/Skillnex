from fractions import Fraction as F
from math import comb, factorial, gcd

def populate(add,numeric,fmt):
    for v in range(1,6):
        def n(topic,title,prompt,answer,why,difficulty='Hard',distractors=None):
            numeric(topic,f'{title} · {v}',prompt,answer,why,difficulty,distractors=distractors)
        p=10+5*v; final=F((100+p)*(100-p),100)
        n('Percentages','A rise and a fall',f'A subscription price rises by {p}% and then falls by {p}%. What percentage of its original price remains?',final,f'Take the original as 100. Multiply by {100+p}/100, then by {100-p}/100. The final value is {fmt(final)}% of the original.','Medium')
        cp=800+200*v; markup=40+10*v; discount=20
        gain=F((100+markup)*(100-discount),100)-100
        n('Profit and loss','Marked price trap',f'A device costs Rs {cp}. The seller marks it {markup}% above cost and offers a {discount}% discount. Find the profit percentage.',gain,f'Marked price is {fmt(F(cp*(100+markup),100))}. Discount applies to that price, not cost. Selling-price/cost = {100+markup}/100 × 80/100, so profit is {fmt(gain)}%.','Medium')
        weight=750+25*v; gain=F(100000,weight)-100
        n('Profit and loss','Short measure',f'A seller charges the cost price of 1 kg but delivers only {weight} g. What is the effective profit percentage? Give an exact value.',gain,f'For a price of Rs 100 per kg, delivered cost is Rs {fmt(F(weight,10))}. Profit/cost × 100 = (1000/{weight} − 1) × 100 = {fmt(gain)}%.')
        base=10000+1000*v; end=base*F(11,10)*F(9,10)*F(6,5)
        n('Percentages','Three-year change',f'A town has {base} residents. In three successive years its population changes by +10%, −10%, and +20%. What is the final population?',end,f'Use compound factors: {base} × 1.1 × 0.9 × 1.2 = {fmt(end)}. Percentage changes cannot simply be added.','Medium')
        a=20+v; b=30+2*v; answer=F(a*72+b*84,a+b)
        n('Averages','Combining batches',f'A batch of {a} candidates averages 72 marks; another batch of {b} averages 84. Find their combined average exactly.',answer,f'Total marks = {a}×72 + {b}×84. Divide by {a+b} candidates to obtain {fmt(answer)}.','Medium')
        size=10+v; avg=40+v; newavg=avg-2; removed=size*avg-(size-1)*newavg
        n('Averages','One score removed',f'{size} scores average {avg}. Removing one score lowers the mean by 2. What score was removed?',removed,f'Original total = {size}×{avg}. Remaining total = {size-1}×{newavg}. Their difference is {removed}.','Medium')
        capacity=40+10*v; take=capacity//5; milk=capacity*F(4,5)**3
        n('Mixtures','Repeated replacement',f'A {capacity}-litre container holds pure milk. Remove {take} litres and refill with water, three times, mixing before each removal. How many litres of milk remain?',milk,f'Each operation retains 4/5 of the milk. Remaining milk = {capacity}×(4/5)^3 = {fmt(milk)} litres.')
        strong=60+5*v; target=30+v; weak=10; ratio=F(strong-target,target-weak)
        n('Mixtures','Alligation ratio',f'Solutions of {weak}% and {strong}% concentration are mixed to obtain {target}%. What is the ratio weak-volume / strong-volume?',ratio,f'Balance solute: {weak}w + {strong}s = {target}(w+s). Thus w/s = ({strong}−{target})/({target}−{weak}) = {fmt(ratio)}.')
        days=12+3*v; other=2*days; time=F(days*other,days+other)
        n('Time and work','Parallel workers',f'A completes a job in {days} days and B in {other}. They work together at constant rates. How many days are needed?',time,f'Daily rate = 1/{days} + 1/{other}. Reciprocal of this sum is {fmt(time)} days.','Medium')
        a=6+v; b=2*a; leak=3*a; time=1/(F(1,a)+F(1,b)-F(1,leak))
        n('Pipes and cisterns','Filling with a leak',f'Two pipes fill a tank in {a} and {b} hours. A drain empties a full tank in {leak} hours. Starting empty, all three stay open. Find the filling time.',time,f'Net hourly rate = 1/{a} + 1/{b} − 1/{leak} = {fmt(1/time)} tank/hour. Take its reciprocal: {fmt(time)} hours.')
        total=30+5*v; alone=total*F(3,2)
        n('Time and work','Unequal efficiency',f'A works twice as fast as B. Together they finish a job in {total} hours. How long would A alone take?',alone,f'If B has rate r, A has rate 2r and together 3r. A alone takes 3/2 of the joint time, or {fmt(alone)} hours.','Medium')
        boat=12+v; stream=3; dist=(boat*boat-9); time=F(dist,boat-stream)+F(dist,boat+stream)
        n('Speed and distance','Round-trip boat',f'A boat moves at {boat} km/h in still water; the current is 3 km/h. It travels {dist} km upstream and the same distance downstream. Find the total time in hours.',time,f'Upstream speed is {boat-3}, downstream {boat+3}. Add {dist}/{boat-3} and {dist}/{boat+3} to get {fmt(time)} hours.')
        length=120+30*v; platform=180+30*v; speed=54+18*v; seconds=F((length+platform)*18,5*speed)
        n('Speed and distance','Passing a platform',f'A train {length} m long moves at {speed} km/h. How many seconds does it take to completely pass a {platform} m platform?',seconds,f'Distance is train length + platform length = {length+platform} m. Speed = {speed}×5/18 m/s. Time = {fmt(seconds)} seconds.','Medium')
        lead=2+v; slow=40; fast=55+5*v; catch=F(lead*slow,fast-slow)
        n('Speed and distance','Delayed pursuit',f'A courier leaves at 40 km/h. A second courier leaves {lead} hours later along the same route at {fast} km/h. How many hours after the second leaves do they meet?',catch,f'Head start = 40×{lead} = {lead*40} km. Relative speed = {fast-40} km/h. Catch-up time is {fmt(catch)} hours.')
        s1=30+5*v;s2=60+5*v; av=F(2*s1*s2,s1+s2)
        n('Speed and distance','Equal-distance average',f'A journey covers equal distances at {s1} km/h and {s2} km/h. What is the overall average speed?',av,f'For equal distances use the harmonic mean: 2×{s1}×{s2}/({s1}+{s2}) = {fmt(av)} km/h.','Medium')
        principal=10000+2000*v; rate=5+v; delta=F(principal*rate*rate,10000)
        n('Interest','Compound versus simple',f'For Rs {principal} at {rate}% annually, find compound interest minus simple interest over two years, with annual compounding.',delta,f'The second year earns interest on the first year’s interest. Difference = P(r/100)^2 = {fmt(delta)} rupees.','Medium')
        initial=100000+10000*v; val=initial*F(4,5)**2*F(9,10)
        n('Interest','Changing depreciation',f'A machine worth Rs {initial} loses 20% of its value in each of the first two years and 10% in the third. What is its final value?',val,f'Value = {initial}×0.8×0.8×0.9 = Rs {fmt(val)}. Each fall applies to the remaining value.','Medium')
        ca=10000+2000*v; cb=18000; ma=8; mb=6; profit=ca*ma+cb*mb
        n('Ratios and partnership','Capital and time',f'A invests Rs {ca} for 8 months; B invests Rs 18000 for 6 months. Total profit is Rs {profit}. What is A’s share?',ca*ma,f'Profit ratio is capital × months: {ca*8}:{cb*6}. Since total profit equals their combined weights, A receives Rs {ca*8}.','Medium')
        letters=5+v; ways=factorial(letters)//2
        n('Permutations','One repeated symbol',f'A code uses {letters} symbols: one symbol appears twice, and all other {letters-2} symbols are distinct. How many different arrangements use every symbol?',ways,f'Arrange all {letters} positions then divide by 2! for the indistinguishable pair: {letters}!/2 = {ways}.','Medium')
        women=4+v; men=5; ways=comb(women,2)*men+comb(women,3)
        n('Combinations','A constrained committee',f'Choose a 3-person committee from {women} women and 5 men with at least two women. How many committees are possible?',ways,f'Exactly two women: C({women},2)×5. Three women: C({women},3). Add the disjoint cases to get {ways}.')
        nballs=7+v; red=3; prob=F(comb(red,2),comb(nballs,2))
        n('Probability','Without replacement',f'A bag has 3 red balls and {nballs-3} blue balls. Two balls are drawn without replacement. What is the probability both are red?',prob,f'Choose 2 of the 3 red balls out of all pairs: C(3,2)/C({nballs},2) = {fmt(prob)}.','Medium')
        trials=4+v; prob=F(comb(trials,2),2**trials)
        n('Probability','Exactly two successes',f'A fair coin is tossed independently {trials} times. What is the probability of exactly two heads?',prob,f'Choose the 2 head positions in C({trials},2) ways. Each full sequence has probability 1/2^{trials}. Result: {fmt(prob)}.')
        pa=F(1,2+v); defecta=F(1,20); defectb=F(1,50); posterior=pa*defecta/(pa*defecta+(1-pa)*defectb)
        n('Probability','Bayes in production',f'Factory A supplies {fmt(pa)} of all items; B supplies the rest. Defect rates are 1/20 for A and 1/50 for B. An item is defective. Find the probability it came from A.',posterior,f'P(A|defect) = P(A)P(defect|A)/P(defect). Substitute {fmt(pa)}×1/20 divided by [{fmt(pa)}×1/20 + {fmt(1-pa)}×1/50] = {fmt(posterior)}.')
        exp=20+v; rem=pow(7,exp,13)
        n('Number systems','Modular powers',f'Find the remainder when 7^{exp} is divided by 13.',rem,f'Powers of 7 modulo 13 repeat every 12 terms. Reducing the exponent and multiplying modulo 13 gives {rem}.',distractors=[x for x in [1,3,5,8,10,12,0] if x!=rem][:3])
        k=10+v; count=0; power=5
        while power<=k*5: count+=(k*5)//power;power*=5
        n('Number systems','Trailing zeroes',f'How many trailing zeroes occur in ({k*5})!?',count,f'Count factors of 5: floor({k*5}/5) + floor({k*5}/25) + further powers if needed. There are {count} factors.','Medium')
        a=12+v; b=18+v; answer=a*b//gcd(a,b)
        n('HCF and LCM','Repeating signals',f'Two signals flash every {a} seconds and {b} seconds. They flash together now. In how many seconds will they next coincide?',answer,f'The first common time is LCM({a},{b}) = {a}×{b}/GCD({a},{b}) = {answer}.','Medium')
        k=2+v; rootsum=3*k; product=2*k*k; answer=rootsum**2-2*product
        n('Algebra','Roots without solving',f'The roots of x² − {rootsum}x + {product} = 0 are r and s. Find r²+s².',answer,f'By Vieta, r+s={rootsum}, rs={product}. Therefore r²+s²=(r+s)²−2rs={answer}.','Medium')
        base=2+v; a=base**2; b=base**3; answer=5
        n('Logarithms','Combining logarithms',f'For x>1, log_x({a}) + log_x({b}) = 1. Find x.',a*b,f'Combine the logs: log_x({a*b})=1, which means x={a*b}.','Medium')
        r=3+v; h=2*r; answer=3*r*r*h
        n('Geometry and mensuration','Cone to cylinder',f'A cone with radius {r} and height {h} is melted into a cylinder of radius {r//1}. Find the cylinder height. Volumes are conserved.',F(h,3),f'Cone volume = π×{r}²×{h}/3. Equate to π×{r}²×H; H={fmt(F(h,3))}.','Medium')
        sides=7+v; diagonals=F(sides*(sides-3),2)
        n('Geometry and mensuration','Polygon diagonals',f'How many diagonals does a convex polygon with {sides} vertices have?',diagonals,f'Each vertex connects diagonally to n−3 others. Divide by 2 because each diagonal was counted twice: {sides}×{sides-3}/2={fmt(diagonals)}.','Medium')
        terms=10+v; first=3; diff=4; target=F(terms*(2*first+(terms-1)*diff),2)
        n('Sequences and series','Arithmetic total',f'Find the sum of the first {terms} terms of 3, 7, 11, 15, … .',target,f'Use n[2a+(n−1)d]/2 with n={terms}, a=3, d=4. The result is {fmt(target)}.','Medium')
        total=3+v; ratio=F(total,total+1); answer=1/(1-ratio)
        n('Sequences and series','Infinite geometric total',f'Evaluate 1 + {fmt(ratio)} + ({fmt(ratio)})² + ({fmt(ratio)})³ + … .',answer,f'The common ratio {fmt(ratio)} has magnitude below 1. Sum = 1/(1−r) = {fmt(answer)}.','Medium')
        m=4+v; points=m*(m+1); sx=F(m*(m+1),2); variance=F(m*m-1,12)
        n('Statistics','Uniform variance',f'A number is chosen uniformly from the integers 1 through {m}. What is its population variance?',variance,f'E[X]=({m}+1)/2. E[X²]=({m}+1)(2×{m}+1)/6. Subtract E[X]² to obtain ({m}²−1)/12={fmt(variance)}.')
        trials=3+v; expected=F(trials,4)
        n('Probability','Expected count',f'Each of {trials} independent sensors triggers with probability 1/4. What is the expected number of triggers?',expected,f'Write the total as a sum of {trials} indicator variables. Linearity of expectation gives {trials}×1/4={fmt(expected)}.','Medium')
        npeople=5+v; arrangements=factorial(npeople-1)*2
        n('Permutations','Adjacent pair',f'{npeople} distinct students stand in a row. Two specified students must stand next to each other, in either order. How many rows are possible?',arrangements,f'Treat the specified pair as one block: ({npeople}−1)! arrangements. There are 2 internal orders. Total = {arrangements}.')
        nitems=6+v; select=3; answer=comb(nitems+select-1,select)
        n('Combinations','Repetition allowed',f'A shop offers {nitems} distinct flavours. A customer buys 3 scoops; flavours may repeat and order does not matter. How many selections are possible?',answer,f'Stars and bars gives C({nitems}+3−1,3)=C({nitems+2},3)={answer}. This counts multisets, not ordered sequences.')
