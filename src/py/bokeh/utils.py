import random
import itertools

def halton(dim, n):
    """Generate n quasi-random points in 'dim' dimensions using the Halton sequence."""
    results = []
    primes = [2, 3, 5]  # Primes for dimensions: R, G, B
    for d in range(dim):
        prime = primes[d]
        result = []
        for i in range(1, n+1):
            f = 1
            r = 0
            while i > 0:
                f = f / prime
                r += f * (i % prime)
                i = i // prime
            result.append(r)
        results.append(result)
    return list(zip(*results))  # Combine results of each dimension into points

def generate_rgb_colors(n):
    # Generate n colors using the Halton sequence scaled to RGB
    points = halton(3, n)
    return [(int(r*255), int(g*255), int(b*255)) for r, g, b in points]

def create_color_symbol_map(cluster_ids):
    symbols = ['circle', 'square', 'triangle', 'diamond', 'inverted_triangle']
    colors = generate_rgb_colors(len(cluster_ids))
    
    # Create a product of colors and symbols, but ensure it's only as large as needed
    product = list(itertools.product(colors, symbols))
    if len(product) < len(cluster_ids):
        raise ValueError("Not enough unique color-symbol combinations")
    
    # Now, shuffle this list to randomize the distribution, if desired
    random.shuffle(product)
    
    # Assign a unique combination to each cluster_id
    color_symbol_map = {cluster_id: combo for cluster_id, combo in zip(cluster_ids, product)}
    
    return color_symbol_map

def prepare_axes(df):
    padding_factor = 0.1  # 10% padding

    # Assuming 'UMAP_1' and 'UMAP_2' 
    # are the columns for x and y axes data.
    x_min, x_max = df['UMAP_1'].min(), df['UMAP_1'].max()
    y_min, y_max = df['UMAP_2'].min(), df['UMAP_2'].max()

    # Calculate padding
    x_padding = (x_max - x_min) * padding_factor
    y_padding = (y_max - y_min) * padding_factor

    # Apply padding
    x_range = (x_min - x_padding + 2, x_max + x_padding + 3)
    y_range = (y_min - y_padding, y_max + y_padding)

    return x_range, y_range

